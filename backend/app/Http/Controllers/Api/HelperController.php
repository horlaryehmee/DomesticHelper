<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmploymentRecordPublicResource;
use App\Http\Resources\HelperPublicResource;
use App\Http\Resources\ReviewPublicResource;
use App\Models\HelperProfileView;
use App\Models\User;
use App\Services\Search\HelperSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelperController extends Controller
{
    /**
     * Public helper search with structured filters and sorting.
     */
    public function index(Request $request, HelperSearchService $search): JsonResponse
    {
        $filters = $request->only([
            'q', 'state', 'city', 'gender', 'skills', 'availability', 'employment_type',
            'verification', 'min_experience', 'salary_min', 'salary_max', 'trust_min', 'trust_max',
        ]);

        $sort = $request->input('sort', 'relevance');
        abort_unless(in_array($sort, ['relevance', 'trust_score', 'experience', 'rating', 'recently_active'], true), 422);

        $results = $search->search($filters, $sort, (int) $request->input('per_page', 12));

        return response()->json([
            'data' => HelperPublicResource::collection($results),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
                'from' => $results->firstItem(),
                'to' => $results->lastItem(),
            ],
        ]);
    }

    /**
     * Polished public helper profile — approved information only.
     */
    public function show(Request $request, User $helper): JsonResponse
    {
        abort_unless($helper->isHelper(), 404);
        abort_unless($helper->status->value === 'active', 404);

        $profile = $helper->helperProfile;
        abort_unless($profile?->is_public, 404);

        $helper->load([
            'helperProfile.skills',
            'helperProfile.trustScore',
            'reviewsReceived' => fn ($q) => $q->where('status', 'approved')->latest()->with(['employmentRecord', 'employer', 'responses.user']),
            'employmentRecordsAsHelper' => fn ($q) => $q->where('verification_status', 'verified')->orderByDesc('start_date'),
        ]);

        // Track profile view for the helper's dashboard (rate-limited per viewer).
        if (! $request->user() || $request->user()->id !== $helper->id) {
            HelperProfileView::create([
                'helper_id' => $helper->id,
                'viewer_id' => $request->user()?->id,
            ]);
        }

        return response()->json([
            'data' => new HelperPublicResource($helper),
            'reviews' => ReviewPublicResource::collection($helper->reviewsReceived),
            'employment_history' => EmploymentRecordPublicResource::collection($helper->employmentRecordsAsHelper),
        ]);
    }

    /**
     * Public approved reviews for a helper.
     */
    public function reviews(Request $request, User $helper): JsonResponse
    {
        abort_unless($helper->isHelper(), 404);

        $reviews = $helper->reviewsReceived()
            ->where('status', 'approved')
            ->latest()
            ->with(['employmentRecord', 'employer', 'responses.user'])
            ->paginate(10);

        return response()->json([
            'data' => ReviewPublicResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'from' => $reviews->firstItem(),
                'to' => $reviews->lastItem(),
                'average_rating' => round($helper->reviewsReceived()->where('status', 'approved')->avg('rating') ?? 0, 1),
            ],
        ]);
    }

    /**
     * Public verified employment history.
     */
    public function employment(User $helper): JsonResponse
    {
        abort_unless($helper->isHelper(), 404);

        $records = $helper->employmentRecordsAsHelper()
            ->where('verification_status', 'verified')
            ->orderByDesc('start_date')
            ->get();

        return response()->json(['data' => EmploymentRecordPublicResource::collection($records)]);
    }
}
