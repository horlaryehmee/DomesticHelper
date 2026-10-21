<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\DeploymentRunner;
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

    public function store(Request $request, DeploymentRunner $runner): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $lock = Cache::lock('admin-deployment-submit', 1200);
        abort_unless($lock->get(), 409, 'An update request is already in progress.');

        try {
            $this->expireStalledUpdate();
            $active = DB::table('deployments')->whereIn('status', ['queued', 'running'])->exists();
            abort_if($active, 409, 'An update is already in progress.');

            $id = DB::table('deployments')->insertGetId([
                'requested_by' => $request->user()->id,
                'status' => 'queued',
                'step' => 'Starting update',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            AuditLogService::log('deployment.requested', $request->user(), null, ['deployment_id' => $id]);
            $runner->run($id);
            $result = DB::table('deployments')->find($id);

            return response()->json([
                'message' => $result->status === 'succeeded' ? 'Site updated successfully.' : $result->step,
                'data' => $result,
            ], $result->status === 'succeeded' ? 200 : 422)
                ->header('Cache-Control', 'no-store');
        } finally {
            $lock->release();
        }
    }

    private function expireStalledUpdate(): void
    {
        DB::table('deployments')->where('status', 'queued')
            ->where('created_at', '<', now()->subMinute())
            ->update(['status' => 'failed', 'step' => 'Previous background update was not started.', 'finished_at' => now(), 'updated_at' => now()]);
        DB::table('deployments')->where('status', 'running')
            ->where('started_at', '<', now()->subMinutes(25))
            ->update(['status' => 'failed', 'step' => 'Update timed out. Check the server log.', 'finished_at' => now(), 'updated_at' => now()]);
    }
}
