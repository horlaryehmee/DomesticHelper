<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IdentityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\IdentityVerificationResource;
use App\Http\Resources\ReferenceCheckResource;
use App\Models\IdentityVerification;
use App\Models\ReferenceCheck;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVerificationController extends Controller
{
    public function identityIndex(Request $request): JsonResponse
    {
        $verifications = IdentityVerification::query()
            ->with(['user', 'evidence'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('type'), fn ($q, $t) => $q->where('type', $t))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $verifications->through(fn ($v) => [
                ...(new IdentityVerificationResource($v))->resolve(),
                'user' => ['uuid' => $v->user->uuid, 'name' => $v->user->full_name],
                'private_notes' => $v->private_notes,
            ]),
            'meta' => [
                'current_page' => $verifications->currentPage(),
                'last_page' => $verifications->lastPage(),
                'per_page' => $verifications->perPage(),
                'total' => $verifications->total(),
            ],
        ]);
    }

    public function identityDecide(Request $request, IdentityVerification $verification, VerificationService $verifications): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $verifications->decide(
            $verification,
            IdentityVerificationStatus::from($data['status']),
            $request->user(),
            $data['notes'] ?? null,
        );

        return response()->json(['data' => new IdentityVerificationResource($verification->fresh()->load('evidence'))]);
    }

    public function referenceIndex(Request $request): JsonResponse
    {
        $checks = ReferenceCheck::query()
            ->with(['helper', 'requestedBy'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => ReferenceCheckResource::collection($checks),
            'meta' => [
                'current_page' => $checks->currentPage(),
                'last_page' => $checks->lastPage(),
                'per_page' => $checks->perPage(),
                'total' => $checks->total(),
            ],
        ]);
    }

    /** Operator records findings after contacting the referee. */
    public function referenceComplete(Request $request, ReferenceCheck $check): JsonResponse
    {
        $data = $request->validate([
            'worked_there' => ['required', 'boolean'],
            'confirmed_role' => ['nullable', 'string', 'max:120'],
            'duration_reported' => ['nullable', 'string', 'max:100'],
            'performance_notes' => ['nullable', 'string', 'max:3000'],
            'reason_for_leaving' => ['nullable', 'string', 'max:2000'],
            'would_rehire' => ['nullable', 'boolean'],
            'additional_notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $check->forceFill([
            ...$data,
            'status' => 'completed',
            'completed_by' => $request->user()->id,
            'completed_at' => now(),
        ])->save();

        \App\Services\AuditLogService::log('reference_check.completed', $check);

        return response()->json(['data' => new ReferenceCheckResource($check->fresh()->load('helper'))]);
    }
}
