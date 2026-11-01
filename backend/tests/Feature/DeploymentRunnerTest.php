<?php

namespace Tests\Feature;

use App\Services\DeploymentRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class DeploymentRunnerTest extends TestCase
{
    use RefreshDatabase;

    private function deployment(): int
    {
        return DB::table('deployments')->insertGetId(['status' => 'queued', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_no_change_retry_still_installs_dependencies_with_a_private_composer_home(): void
    {
        $runner = new SimulatedDeploymentRunner;
        $id = $this->deployment();
        $runner->run($id);
        $this->assertDatabaseHas('deployments', ['id' => $id, 'status' => 'succeeded']);
        $composer = array_values(array_filter($runner->calls, fn ($call) => $call['command'][0] === 'composer'));
        $this->assertCount(1, $composer);
        $this->assertNotEmpty($composer[0]['environment']['COMPOSER_HOME']);
        $this->assertDirectoryExists($composer[0]['environment']['COMPOSER_HOME']);
        $this->assertTrue(is_writable($composer[0]['environment']['COMPOSER_HOME']));
        $this->assertSame('install', $composer[0]['command'][1]);
        $this->assertContains('--no-dev', $composer[0]['command']);
        $this->assertSame('same-commit', DB::table('deployments')->find($id)->from_commit);
        $this->assertSame('same-commit', DB::table('deployments')->find($id)->to_commit);
    }

    public function test_dependency_failure_retains_diagnostic_output_and_stops_publishing(): void
    {
        $runner = new SimulatedDeploymentRunner;
        $runner->failComposer = true;
        $id = $this->deployment();
        $runner->run($id);
        $record = DB::table('deployments')->find($id);
        $this->assertSame('failed', $record->status);
        $this->assertStringContainsString('Installing PHP dependencies failed', $record->step);
        $this->assertStringContainsString('Simulated Composer failure', $record->output);
        $this->assertEmpty(array_filter($runner->calls, fn ($call) => $call['command'][0] === 'bash'));
    }
}
class SimulatedDeploymentRunner extends DeploymentRunner
{
    public array $calls = [];

    public bool $failComposer = false;

    protected function makeProcess(array $command, string $root, array $environment): Process
    {
        $this->calls[] = ['command' => $command, 'environment' => $environment];
        $failed = $command[0] === 'composer' && $this->failComposer;
        $output = match (implode(' ', $command)) {
            'git rev-parse HEAD' => 'same-commit','git branch --show-current' => 'main',default => ''
        };
        $process = Mockery::mock(Process::class);
        $process->shouldReceive('setTimeout')->once();
        $process->shouldReceive('run')->once()->andReturnUsing(function ($callback) use ($failed) {
            if ($failed) {
                $callback(Process::ERR, 'Simulated Composer failure');
            }

return $failed ? 1 : 0;
        });
        $process->shouldReceive('isSuccessful')->once()->andReturn(! $failed);
        $process->shouldReceive('getExitCode')->andReturn($failed ? 1 : 0);
        $process->shouldReceive('getOutput')->andReturn($output);

        return $process;
    }
}
