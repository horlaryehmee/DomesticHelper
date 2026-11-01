<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdentityVerification;
use App\Models\User;
use App\Services\PlatformFeatures;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, VerificationService $verifications): JsonResponse
    {
        $user = $request->user();

        $features = app(PlatformFeatures::class);
        if ($user->isAdmin()) {
            return response()->json(['data' => [
                'total_users' => User::count(),
                'pending_accounts' => User::where('approval_status', 'pending')->count(),
                'pending_verifications' => IdentityVerification::where('status', 'pending')->count(),
            ]]);
        }
        $recentNotifications = $user->notifications()->latest()->take(10)->get()->filter(fn ($notification) => empty($notification->data['action_url']) || $features->allows(parse_url($notification->data['action_url'], PHP_URL_PATH) ?: '/', false))->values()->take(5)->values();

        return response()->json([
            'data' => ['profile_completion' => $verifications->completionPercent($user), 'email_verified' => (bool) $user->email_verified_at, 'approval_status' => $user->approval_status],
            'verification_badges' => $verifications->badgesFor($user),
            'recent_notifications' => $recentNotifications,
        ]);
    }
}
