<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\DisputeResource;
use App\Models\Dispute;
use App\Services\DisputeService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class AdminDisputeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $disputes = Dispute::query()
            ->with(['helper', 'disputable', 'evidence'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(15);

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

    public function show(Dispute $dispute): JsonResponse
    {
        return response()->json(['data' => new DisputeResource($dispute->load(['helper', 'disputable', 'evidence']))]);
    }

    /**
     * Resolution. Upholding a dispute against a trust score event reverses
     * it (restores the score). Every decision is audited.
     */
    public function decide(Request $request, Dispute $dispute, DisputeService $disputes, NotificationService $notifications): JsonResponse
    {
        $this->authorize('decide', Dispute::class);

        $data = $request->validate([
            'uphold' => ['required', 'boolean'],
            'decision' => ['required', 'string', 'min:10', 'max:3000'],
        ]);

        $disputes->decide($dispute, (bool) $data['uphold'], $request->user(), $data['decision']);

        $notifications->send($dispute->helper, new PlatformNotification(
            type: 'dispute_decided',
            title: 'Dispute resolution',
            body: $data['uphold']
                ? 'Your dispute was upheld. Any affected trust score has been restored.'
                : 'After review, your dispute was not upheld. Details are available in your dashboard.',
        ));

        return response()->json(['data' => new DisputeResource($dispute->fresh()->load(['helper', 'disputable', 'evidence']))]);
    }
}
