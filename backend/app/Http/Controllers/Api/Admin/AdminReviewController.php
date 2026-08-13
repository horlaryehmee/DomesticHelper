<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Services\NotificationService;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class AdminReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::query()
            ->with(['helper', 'employer', 'employmentRecord', 'responses.user'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    /** Moderation: approve (publish) / reject (hide) / remove. */
    public function moderate(Request $request, Review $review, ReviewService $reviews, NotificationService $notifications): JsonResponse
    {
        $this->authorize('moderate', Review::class);

        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected,removed'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $reviews->moderate($review, ReviewStatus::from($data['status']), $request->user(), $data['note'] ?? null);

        $notifications->send($review->employer, new PlatformNotification(
            type: 'review_moderated',
            title: 'Review moderation',
            body: "Your review has been ".ReviewStatus::from($data['status'])->label().'.',
        ));
        $notifications->send($review->helper, new PlatformNotification(
            type: 'review_moderated',
            title: 'Review moderation',
            body: "A review about you has been ".ReviewStatus::from($data['status'])->label().'.',
        ));

        return response()->json(['data' => new ReviewResource($review->fresh()->load(['helper', 'employer', 'employmentRecord', 'responses.user']))]);
    }
}
