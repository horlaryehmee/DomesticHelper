<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TrustScoreEventResource;
use App\Models\TrustScoreEvent;
use App\Models\TrustScoreRule;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTrustScoreController extends Controller
{
    public function rules(): JsonResponse
    {
        return response()->json(['data' => TrustScoreRule::query()->orderBy('points', 'desc')->get()]);
    }

    public function storeRule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'max:80', 'unique:trust_score_rules,slug'],
            'name' => ['required', 'string', 'max:120'],
            'event_type' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:500'],
            'points' => ['required', 'integer', 'between:-100,100'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $rule = TrustScoreRule::create($data);

        AuditLogService::log('trust_rule.created', $rule);

        return response()->json(['data' => $rule], 201);
    }

    public function updateRule(Request $request, TrustScoreRule $rule): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'points' => ['sometimes', 'integer', 'between:-100,100'],
            'description' => ['nullable', 'string', 'max:500'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $old = $rule->only(['name', 'points', 'active']);
        $rule->update($data);

        AuditLogService::log('trust_rule.updated', $rule, $old, $rule->only(['name', 'points', 'active']));

        return response()->json(['data' => $rule->fresh()]);
    }

    /** Recalculate every helper after rule changes. */
    public function recalculateAll(TrustScoreService $trustScore): JsonResponse
    {
        $count = $trustScore->recalculateAll();

        AuditLogService::log('trust_score.recalculated_all', null, null, ['helpers' => $count]);

        return response()->json(['data' => ['recalculated' => $count]]);
    }

    public function recalculateOne(Request $request, User $helper, TrustScoreService $trustScore): JsonResponse
    {
        abort_unless($helper->isHelper(), 422);

        $score = $trustScore->recalculate($helper);

        return response()->json(['data' => $score->load('helper')]);
    }

    /**
     * Manual adjustment (admin only) — always creates an immutable,
     * audited event. Employers can never reach this path.
     */
    public function manualAdjust(Request $request, User $helper, TrustScoreService $trustScore): JsonResponse
    {
        abort_unless($helper->isHelper(), 422);

        $data = $request->validate([
            'points' => ['required', 'integer', 'between:-100,100', 'not_in:0'],
            'note' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $event = $trustScore->recordEvent(
            $helper,
            'manual_adjustment',
            $data['points'],
            null,
            $data['note'],
            $request->user(),
        );

        return response()->json(['data' => new TrustScoreEventResource($event->load('rule'))], 201);
    }

    public function events(Request $request): JsonResponse
    {
        $events = TrustScoreEvent::query()
            ->with(['helper', 'rule', 'source'])
            ->when($request->input('helper_uuid'), function ($q, $uuid) {
                $q->whereHas('helper', fn ($h) => $h->where('uuid', $uuid));
            })
            ->when($request->input('event_type'), fn ($q, $t) => $q->where('event_type', $t))
            ->latest()
            ->paginate(25);

        return response()->json([
            'data' => $events->through(fn ($e) => [
                ...(new TrustScoreEventResource($e))->resolve(),
                'helper_name' => $e->helper->full_name,
                'helper_uuid' => $e->helper->uuid,
            ]),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
            ],
        ]);
    }
}
