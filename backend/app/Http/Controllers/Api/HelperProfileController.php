<?php

namespace App\Http\Controllers\Api;

use App\Enums\IdentityVerificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profiles\UpdateHelperProfileRequest;
use App\Http\Resources\IdentityVerificationResource;
use App\Http\Resources\UserResource;
use App\Models\HelperProfile;
use App\Services\AuditLogService;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class HelperProfileController extends Controller
{
    public function show(VerificationService $verifications): JsonResponse
    {
        $user = request()->user()->load(['helperProfile.skills']);

        return response()->json([
            'data' => new UserResource($user),
            'verification_badges' => $verifications->badgesFor($user),
        ]);
    }

    public function update(UpdateHelperProfileRequest $request): JsonResponse
    {
        $user = request()->user();
        $data = $request->validated();
        $profile = $user->helperProfile;

        DB::transaction(function () use ($user, $profile, $data, $request) {
            $user->update([
                'first_name' => $data['first_name'] ?? $user->first_name,
                'last_name' => $data['last_name'] ?? $user->last_name,
                'phone' => $data['phone'] ?? $user->phone,
            ]);

            $profileData = collect($data)->only([
                'date_of_birth', 'gender', 'state', 'city', 'address_line',
                'years_experience', 'availability', 'employment_type',
                'expected_salary_min', 'expected_salary_max', 'bio', 'is_public',
            ])->toArray();

            if (isset($data['nin'])) {
                $ninHash = hash('sha256', $data['nin']);
                abort_if(
                    HelperProfile::query()->where('nin_hash', $ninHash)->where('id', '!=', $profile->id)->exists(),
                    422,
                    'A helper profile with this NIN already exists.',
                );
                $profileData['nin_encrypted'] = Crypt::encryptString($data['nin']);
                $profileData['nin_hash'] = $ninHash;
                $profileData['nin_last4'] = substr($data['nin'], -4);
            }

            if ($profileData) {
                $profile->update($profileData);
            }

            if (isset($data['skills'])) {
                $profile->skills()->sync($data['skills']);
            }

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('profiles', 'public');
                $profile->forceFill(['photo_path' => $path])->save();
            }
        });

        AuditLogService::log('helper_profile.updated', $user);

        return response()->json([
            'data' => new UserResource($user->fresh()->load('helperProfile.skills')),
        ]);
    }

    /**
     * Request an identity verification step (photo / NIN / address).
     */
    public function requestVerification(string $type, VerificationService $verifications): JsonResponse
    {
        $verificationType = IdentityVerificationType::tryFrom($type);
        abort_unless($verificationType && in_array($verificationType, [
            IdentityVerificationType::Photo,
            IdentityVerificationType::Nin,
            IdentityVerificationType::Address,
        ], true), 422, 'Invalid verification type.');

        $verification = $verifications->request(request()->user(), $verificationType);

        return response()->json(['data' => new IdentityVerificationResource($verification)], 201);
    }

    public function verifications(): JsonResponse
    {
        $verifications = request()->user()->identityVerifications()
            ->with('evidence')
            ->get();

        return response()->json(['data' => IdentityVerificationResource::collection($verifications)]);
    }

    public function publishStatus(): JsonResponse
    {
        $user = request()->user();
        $profile = $user->helperProfile;

        $profile->forceFill(['is_public' => ! $profile->is_public])->save();

        AuditLogService::log('helper_profile.visibility_changed', $user, null, ['is_public' => $profile->is_public]);

        return response()->json(['data' => ['is_public' => $profile->is_public]]);
    }
}
