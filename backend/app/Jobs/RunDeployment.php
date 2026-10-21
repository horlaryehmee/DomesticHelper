<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class RunDeployment implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 1200;

    public function __construct(public int $deploymentId) {}

    public function handle(): void
    {
        $root = dirname(base_path());
        $record = DB::table('deployments')->find($this->deploymentId);
        if (! $record || $record->status !== 'queued') return;

        DB::table('deployments')->where('id', $this->deploymentId)->update([
            'status' => 'running', 'step' => 'Checking deployment',
            'started_at' => now(), 'updated_at' => now(),
        ]);

        $output = '';

        try {
            if (! is_file($root.'/.git/HEAD') || ! is_file($root.'/scripts/cpanel-deploy.sh')) {
                throw new \RuntimeException('This server must run from a Git checkout with the cPanel deploy script.');
            }

            $run = function (array $command, string $step, int $timeout = 120) use ($root, &$output): string {
                DB::table('deployments')->where('id', $this->deploymentId)->update([
                    'step' => $step, 'updated_at' => now(),
                ]);
                $process = new Process($command, $root);
                $process->setTimeout($timeout);
                $process->run(function ($type, $chunk) use (&$output) {
                    $output = mb_substr($output.$chunk, -16000);
                    DB::table('deployments')->where('id', $this->deploymentId)->update([
                        'output' => $output, 'updated_at' => now(),
                    ]);
                });
                if (! $process->isSuccessful()) {
                    throw new \RuntimeException($step.' failed (exit '.$process->getExitCode().').');
                }
                return trim($process->getOutput());
            };

            $from = $run(['git', 'rev-parse', 'HEAD'], 'Reading current version');
            DB::table('deployments')->where('id', $this->deploymentId)->update(['from_commit' => $from]);
            if ($run(['git', 'status', '--porcelain', '--untracked-files=no'], 'Checking local changes') !== '') {
                throw new \RuntimeException('Tracked files have local changes. Update them manually before deploying.');
            }
            if ($run(['git', 'branch', '--show-current'], 'Checking branch') !== 'main') {
                throw new \RuntimeException('This checkout must be on the main branch.');
            }

            $run(['git', 'fetch', 'origin', 'main'], 'Fetching Git updates', 180);
            $run(['git', 'merge', '--ff-only', 'origin/main'], 'Updating code', 120);
            $to = $run(['git', 'rev-parse', 'HEAD'], 'Reading new version');
            DB::table('deployments')->where('id', $this->deploymentId)->update(['to_commit' => $to]);

            $run(['composer', 'install', '--working-dir=backend', '--no-dev', '--prefer-dist', '--optimize-autoloader', '--no-interaction'], 'Installing PHP dependencies', 420);
            $run(['bash', 'scripts/install-public-html.sh'], 'Updating site router', 60);
            $run(['bash', 'scripts/cpanel-deploy.sh'], 'Migrating and publishing site', 300);

            DB::table('deployments')->where('id', $this->deploymentId)->update([
                'status' => 'succeeded', 'step' => 'Site is up to date',
                'output' => $output, 'finished_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Throwable $error) {
            DB::table('deployments')->where('id', $this->deploymentId)->update([
                'status' => 'failed', 'step' => $error->getMessage(),
                'output' => $output, 'finished_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
