<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\DemoDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDemoController extends Controller
{
    public function status(Request $request, DemoDataService $demo): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        return response()->json(['data' => $demo->status()]);
    }

    public function fill(Request $request, DemoDataService $demo): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $status = $demo->fill();
        AuditLogService::log('demo.filled', $request->user(), null, $status);

        return response()->json(['data' => $status]);
    }

    public function clear(Request $request, DemoDataService $demo): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $request->validate(['confirmation' => ['required', 'in:CLEAR DEMO']]);

        $status = $demo->clear();
        AuditLogService::log('demo.cleared', $request->user(), null, $status);

        return response()->json(['data' => $status]);
    }
}
