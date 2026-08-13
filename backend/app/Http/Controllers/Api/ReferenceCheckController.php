<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReferenceCheckResource;
use App\Models\ReferenceCheck;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceCheckController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $checks = ReferenceCheck::query()
            ->where('requested_by', $user->id)
            ->with('helper')
            ->latest()
            ->paginate(12);

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

    /** Premium reference check request — an operator follows up manually. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'referee_name' => ['required', 'string', 'max:120'],
            'referee_phone' => ['nullable', 'string', 'max:30'],
            'referee_email' => ['nullable', 'email', 'max:120'],
            'relationship' => ['nullable', 'string', 'max:100'],
            'employment_period' => ['nullable', 'string', 'max:100'],
        ]);

        $helper = User::where('uuid', $data['helper_uuid'])->firstOrFail();
        abort_unless($helper->isHelper(), 422);

        $check = ReferenceCheck::create([
            ...collect($data)->except('helper_uuid')->toArray(),
            'requested_by' => $request->user()->id,
            'helper_id' => $helper->id,
            'status' => 'pending',
        ]);

        AuditLogService::log('reference_check.requested', $check);

        return response()->json(['data' => new ReferenceCheckResource($check->load('helper'))], 201);
    }
}
