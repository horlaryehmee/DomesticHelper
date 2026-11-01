<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class DeploymentRunner
{
    public function run(int $deploymentId): void
    {
        @set_time_limit(0);
        $root = dirname(base_path());
        $record = DB::table('deployments')->find($deploymentId);
        if (! $record || $record->status !== 'queued') {
            return;
        }

        DB::table('deployments')->where('id', $deploymentId)->update([
            'status' => 'running', 'step' => 'Checking deployment',
            'started_at' => now(), 'updated_at' => now(),
        ]);

        $output = '';

        try {
            if (! is_file($root.'/.git/HEAD') || ! is_file($root.'/scripts/cpanel-deploy.sh')) {
                throw new \RuntimeException('This server must run from a Git checkout with the cPanel deploy script.');
            }

            $run = function (array $command, string $step, int $timeout = 120, array $environment = []) use ($root, $deploymentId, &$output): string {
                DB::table('deployments')->where('id', $deploymentId)->update([
                    'step' => $step, 'updated_at' => now(),
                ]);
                $process = $this->makeProcess($command, $root, $environment);
                $process->setTimeout($timeout);
                $process->run(function ($type, $chunk) use ($deploymentId, &$output) {
                    $output = mb_substr($output.$chunk, -16000);
                    DB::table('deployments')->where('id', $deploymentId)->update([
                        'output' => $output, 'updated_at' => now(),
                    ]);
                });
                if (! $process->isSuccessful()) {
                    throw new \RuntimeException($step.' failed (exit '.$process->getExitCode().').');
                }

                return trim($process->getOutput());
            };

            $from = $run(['git', 'rev-parse', 'HEAD'], 'Reading current version');
            DB::table('deployments')->where('id', $deploymentId)->update(['from_commit' => $from]);
            if ($run(['git', 'status', '--porcelain', '--untracked-files=no'], 'Checking local changes') !== '') {
                throw new \RuntimeException('Tracked files have local changes. Update them manually before deploying.');
            }
            if ($run(['git', 'branch', '--show-current'], 'Checking branch') !== 'main') {
                throw new \RuntimeException('This checkout must be on the main branch.');
            }

            $run(['git', 'fetch', 'origin', 'main'], 'Fetching Git updates', 180);
            $run(['git', 'merge', '--ff-only', 'origin/main'], 'Updating code', 120);
            $to = $run(['git', 'rev-parse', 'HEAD'], 'Reading new version');
            DB::table('deployments')->where('id', $deploymentId)->update(['to_commit' => $to]);

            // Web server workers may have neither HOME nor COMPOSER_HOME.
            // Keep Composer configuration/cache private and writable by this app.
            $composerHome = getenv('COMPOSER_HOME') ?: storage_path('app/private/composer');
            File::ensureDirectoryExists($composerHome, 0700);
            if (! is_writable($composerHome)) {
                throw new \RuntimeException('Composer home is not writable. Check permissions on '.$composerHome.'.');
            }

            // Always reconcile vendor with the lock file: a prior attempt may have
            // pulled the new commit and then failed during dependency installation.
            $run(['composer', 'install', '--working-dir=backend', '--no-dev', '--prefer-dist', '--optimize-autoloader', '--no-interaction'], 'Installing PHP dependencies', 420, [
                'COMPOSER_HOME' => $composerHome,
            ]);
            $run(['bash', 'scripts/install-public-html.sh'], 'Updating site router', 60);
            $run(['bash', 'scripts/cpanel-deploy.sh'], 'Migrating and publishing site', 300);

            DB::table('deployments')->where('id', $deploymentId)->update([
                'status' => 'succeeded', 'step' => 'Site is up to date',
                'output' => $output, 'finished_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Throwable $error) {
            DB::table('deployments')->where('id', $deploymentId)->update([
                'status' => 'failed', 'step' => $error->getMessage(),
                'output' => $output, 'finished_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    protected function makeProcess(array $command, string $root, array $environment): Process
    {
        return new Process($command, $root, $environment);
    }
}
