<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDisputeRequest;
use App\Http\Resources\DisputeResource;
use App\Models\Dispute;
use App\Models\IdentityVerification;
use App\Models\Report;
use App\Models\Review;
use App\Models\TrustScoreEvent;
use App\Services\DisputeService;
use App\Services\EvidenceService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class DisputeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $disputes = Dispute::where('helper_id', $request->user()->id)
            ->with(['disputable', 'evidence'])
            ->latest()
            ->paginate(12);

        return response()->json([
            'data' => DisputeResource::collection($disputes),
            'meta' => [
                'current_page' => $disputes->currentPage(),
                'last_page' => $disputes->lastPage(),
                'per_page' => $disputes->perPage(),
                'total' => $disputes->total(),
            ],
        ]);
    }

    /**
     * Helpers dispute reviews, reports, trust score events or verification
     * results — with supporting evidence.
     */
    public function store(StoreDisputeRequest $request, DisputeService $disputes, EvidenceService $evidence, NotificationService $notifications): JsonResponse
    {
        $this->authorize('create', Dispute::class);

        $helper = $request->user();

        $disputable = match ($request->input('disputable_type')) {
            'review' => Review::where('uuid', $request->input('disputable_uuid'))->firstOrFail(),
            'report' => Report::where('uuid', $request->input('disputable_uuid'))->firstOrFail(),
            'trust_score_event' => TrustScoreEvent::where('uuid', $request->input('disputable_uuid'))->firstOrFail(),
            'identity_verification' => IdentityVerification::where('uuid', $request->input('disputable_uuid'))->firstOrFail(),
            default => abort(422, 'Unknown dispute target.'),
        };

        // Ownership guard: helpers can only dispute things about themselves.
        $subjectId = match (true) {
            $disputable instanceof Review => $disputable->helper_id,
            $disputable instanceof Report => $disputable->helper_id,
            $disputable instanceof TrustScoreEvent => $disputable->helper_id,
            $disputable instanceof IdentityVerification => $disputable->user_id,
        };
        abort_unless($subjectId === $helper->id, 403, 'You can only dispute items concerning your own profile.');

        $dispute = $disputes->submit(
            $helper,
            $disputable,
            $request->input('reason'),
            $request->input('explanation'),
        );

        foreach ($request->file('evidence', []) as $file) {
            $evidence->store($file, $dispute, $helper);
        }

        $notifications->sendToMany(
            \App\Models\User::query()->where('user_type', 'admin')->get(),
            new PlatformNotification(
                type: 'dispute_new',
                title: 'New dispute submitted',
                body: 'A helper has submitted a dispute. It is awaiting review.',
                sendEmail: false,
            ),
        );

        return response()->json(['data' => new DisputeResource($dispute->load(['disputable', 'evidence']))], 201);
    }

    public function show(Request $request, Dispute $dispute): JsonResponse
    {
        $this->authorize('view', $dispute);

        return response()->json(['data' => new DisputeResource($dispute->load(['disputable', 'evidence']))]);
    }
}
