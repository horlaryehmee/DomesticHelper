<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ComingSoon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteStatusController extends Controller
{
    public function __invoke(Request $request, ComingSoon $comingSoon): JsonResponse
    {
        $enabled = $comingSoon->enabled();

        return response()->json([
            'enabled' => $enabled,
            'access' => ! $enabled || $comingSoon->hasPreviewAccess($request->header('X-Site-Preview-Token')),
        ])->header('Cache-Control', 'no-store');
    }
}
