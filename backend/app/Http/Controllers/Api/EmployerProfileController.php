<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profiles\UpdateEmployerProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class EmployerProfileController extends Controller
{
    public function show(): JsonResponse
    {
        $user = request()->user()->load('employerProfile');

        return response()->json(['data' => new UserResource($user)]);
    }

    public function update(UpdateEmployerProfileRequest $request): JsonResponse
    {
        $user = request()->user();
        $data = $request->validated();

        $old = $user->only(['first_name', 'last_name', 'phone']);

        DB::transaction(function () use ($user, $data, $request) {
            $user->update([
                'first_name' => $data['first_name'] ?? $user->first_name,
                'last_name' => $data['last_name'] ?? $user->last_name,
                'phone' => $data['phone'] ?? $user->phone,
            ]);

            $profileData = collect($data)->only(['profile_type', 'agency_name', 'address_line', 'city', 'state', 'bio'])->toArray();
            if ($profileData) {
                $user->employerProfile()->update($profileData);
            }

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')->store('avatars', 'public');
                $user->forceFill(['avatar_path' => $path])->save();
            }
        });

        AuditLogService::log('employer_profile.updated', $user, $old, $user->only(['first_name', 'last_name', 'phone']));

        return response()->json([
            'data' => new UserResource($user->fresh()->load('employerProfile')),
        ]);
    }
}
