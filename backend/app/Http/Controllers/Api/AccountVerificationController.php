<?php

namespace App\Http\Controllers\Api;

use App\Enums\IdentityVerificationType;
use App\Http\Controllers\Controller;
use App\Http\Resources\IdentityVerificationResource;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;

class AccountVerificationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => IdentityVerificationResource::collection(
            request()->user()->identityVerifications()->with('evidence')->get()
        )]);
    }

    public function store(string $type, VerificationService $verifications): JsonResponse
    {
        $verificationType = IdentityVerificationType::tryFrom($type);
        abort_unless($verificationType && in_array($verificationType, [
            IdentityVerificationType::Photo, IdentityVerificationType::Nin, IdentityVerificationType::Address,
        ], true), 422, 'Invalid verification type.');

        return response()->json(['data' => new IdentityVerificationResource(
            $verifications->request(request()->user(), $verificationType)
        )], 201);
    }
}
