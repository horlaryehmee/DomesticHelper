<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\RunDeployment;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminDeploymentController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $this->expireStalledUpdate();

        return response()->json(['data' => DB::table('deployments')->latest('id')->first()])
            ->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        abort_unless(config('queue.default') === 'database', 503, 'Deployment requires the database queue.');

        $lock = Cache::lock('admin-deployment-submit', 10);
        abort_unless($lock->get(), 409, 'An update request is already in progress.');

        try {
            $this->expireStalledUpdate();
            $active = DB::table('deployments')->whereIn('status', ['queued', 'running'])->exists();
            abort_if($active, 409, 'An update is already in progress.');

            $id = DB::table('deployments')->insertGetId([
                'requested_by' => $request->user()->id,
                'status' => 'queued',
                'step' => 'Waiting for queue worker',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            try {
                RunDeployment::dispatch($id);
            } catch (\Throwable $error) {
                DB::table('deployments')->where('id', $id)->update([
                    'status' => 'failed', 'step' => 'Could not queue update',
                    'finished_at' => now(), 'updated_at' => now(),
                ]);
                throw $error;
            }

            AuditLogService::log('deployment.requested', $request->user(), null, ['deployment_id' => $id]);

            return response()->json(['data' => DB::table('deployments')->find($id)], 202)
                ->header('Cache-Control', 'no-store');
        } finally {
            $lock->release();
        }
    }

    private function expireStalledUpdate(): void
    {
        DB::table('deployments')->where('status', 'queued')
            ->where('created_at', '<', now()->subMinutes(15))
            ->update(['status' => 'failed', 'step' => 'Queue worker did not start the update.', 'finished_at' => now(), 'updated_at' => now()]);
        DB::table('deployments')->where('status', 'running')
            ->where('started_at', '<', now()->subMinutes(25))
            ->update(['status' => 'failed', 'step' => 'Update timed out. Check the server log.', 'finished_at' => now(), 'updated_at' => now()]);
    }
}
