<?php

namespace App\Jobs;

use App\Services\DeploymentRunner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

// Kept so update requests queued by an older release can finish safely.
class RunDeployment implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 1200;

    public function __construct(public int $deploymentId) {}

    public function handle(DeploymentRunner $runner): void
    {
        $runner->run($this->deploymentId);
    }
}
