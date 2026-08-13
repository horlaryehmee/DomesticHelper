<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HelperPublicResource;
use App\Models\User;
use App\Services\StatsService;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, StatsService $stats, VerificationService $verifications): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return response()->json(['data' => $stats->admin()]);
        }

        $recentNotifications = $user->notifications()->latest()->take(5)->get();

        if ($user->isEmployer()) {
            return response()->json([
                'data' => array_merge($stats->employer($user), [
                    'profile_completion' => $verifications->completionPercent($user),
                ]),
                'saved_helpers' => HelperPublicResource::collection(
                    User::query()
                        ->whereHas('savedBy', fn ($q) => $q->where('employer_id', $user->id))
                        ->with(['helperProfile.skills', 'helperProfile.trustScore'])
                        ->latest('last_active_at')
                        ->limit(4)
                        ->get(),
                ),
                'recent_notifications' => $recentNotifications,
            ]);
        }

        return response()->json([
            'data' => array_merge($stats->helper($user), [
                'trust_score' => $user->trustScore ? [
                    'score' => $user->trustScore->score,
                    'category' => $user->trustScore->category?->value,
                    'label' => $user->trustScore->category?->label(),
                ] : ['score' => 50, 'category' => 'new', 'label' => 'Building Trust'],
            ]),
            'verification_badges' => $verifications->badgesFor($user),
            'recent_notifications' => $recentNotifications,
        ]);
    }
}
