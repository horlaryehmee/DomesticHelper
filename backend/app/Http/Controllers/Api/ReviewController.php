<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\EmploymentRecord;
use App\Models\Review;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class ReviewController extends Controller
{
    /** Reviews the current user wrote or received. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $reviews = Review::query()
            ->where(fn ($q) => $q->where('employer_id', $user->id)->orWhere('helper_id', $user->id))
            ->with(['helper', 'employer', 'employmentRecord', 'responses.user'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(12);

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

    /**
     * Only verified-employment employers may review — enforced in the policy.
     */
    public function store(StoreReviewRequest $request, ReviewService $reviews, NotificationService $notifications): JsonResponse
    {
        $helper = User::where('uuid', $request->input('helper_uuid'))->firstOrFail();
        $record = EmploymentRecord::where('uuid', $request->input('employment_record_uuid'))->firstOrFail();

        $this->authorize('create', [Review::class, $helper, $record]);

        $review = $reviews->create($request->user(), $helper, $record, $request->validated());

        $notifications->send($helper, new PlatformNotification(
            type: 'review_received',
            title: 'New review received',
            body: 'An employer has submitted a review of your work. It will appear publicly after moderation.',
        ));

        return response()->json(['data' => new ReviewResource($review->load(['helper', 'employer', 'employmentRecord']))], 201);
    }

    public function show(Request $request, Review $review): JsonResponse
    {
        $this->authorize('view', $review);

        return response()->json(['data' => new ReviewResource($review->load(['helper', 'employer', 'employmentRecord', 'responses.user']))]);
    }

    /** Helper or employer replies publicly to a review. */
    public function respond(Request $request, Review $review, ReviewService $reviews): JsonResponse
    {
        $this->authorize('respond', $review);

        $data = $request->validate(['content' => ['required', 'string', 'min:2', 'max:2000']]);

        $reviews->addResponse($review, $request->user(), $data['content']);

        return response()->json(['data' => new ReviewResource($review->fresh()->load(['helper', 'employer', 'employmentRecord', 'responses.user']))], 201);
    }
}
