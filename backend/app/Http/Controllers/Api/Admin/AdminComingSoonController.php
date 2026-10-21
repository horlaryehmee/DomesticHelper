<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\ComingSoon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminComingSoonController extends Controller
{
    public function show(ComingSoon $comingSoon): JsonResponse
    {
        return response()->json(['data' => [
            'enabled' => $comingSoon->enabled(),
            'preview_token' => $comingSoon->previewToken(),
        ]])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request, ComingSoon $comingSoon): JsonResponse
    {
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        $old = $comingSoon->enabled();
        $comingSoon->setEnabled($data['enabled']);

        AuditLogService::log('settings.coming_soon_updated', $request->user(), ['enabled' => $old], ['enabled' => $data['enabled']]);

        return $this->show($comingSoon);
    }

    public function rotate(Request $request, ComingSoon $comingSoon): JsonResponse
    {
        $comingSoon->rotatePreviewToken();
        AuditLogService::log('settings.coming_soon_preview_rotated', $request->user());

        return $this->show($comingSoon);
    }
}
