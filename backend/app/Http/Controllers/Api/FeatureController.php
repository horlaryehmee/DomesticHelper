<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\PlatformFeatures;
use Illuminate\Http\Request;

class FeatureController extends Controller
{
    public function index(PlatformFeatures $features)
    {
        return response()->json($features->publicSettings())->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, PlatformFeatures $features)
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        return response()->json(['data' => $features->adminSettings()]);
    }

    public function update(Request $request, PlatformFeatures $features)
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $data = $request->validate(['features' => 'required|array', 'features.*' => 'required|boolean']);
        $old = $features->configured();
        $features->save($data['features']);
        AuditLogService::log('features.updated', $request->user(), $old, $data['features']);

        return response()->json(['data' => $features->adminSettings()]);
    }
}
