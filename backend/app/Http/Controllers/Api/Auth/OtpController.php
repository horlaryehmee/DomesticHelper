<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;

class OtpController extends Controller
{
    public function send(SendOtpRequest $request, OtpService $otp): JsonResponse
    {
        $recipient = $request->input('recipient');
        $purpose = $request->input('purpose');

        // Only send OTPs to recipients we know for login/reset flows.
        if (in_array($purpose, ['login', 'reset_password'], true)) {
            $user = User::query()
                ->where(fn ($q) => $q->where('phone', $recipient)->orWhere('email', $recipient))
                ->first();
            abort_unless($user, 422, 'No account was found with this phone number or email.');
        }

        $code = $otp->send($recipient, $purpose, $user ?? null);

        AuditLogService::log('otp.sent', 'otp', null, ['recipient' => $recipient, 'purpose' => $purpose]);

        return response()->json([
            'message' => 'Verification code sent.',
            // Dev convenience only — never included outside debug builds.
            'debug_code' => config('app.debug') ? $code : null,
        ]);
    }

    public function verify(VerifyOtpRequest $request, OtpService $otp): JsonResponse
    {
        $recipient = $request->input('recipient');
        $purpose = $request->input('purpose');

        $otpRecord = $otp->verify($recipient, $purpose, $request->input('code'));

        $user = null;
        if ($purpose === 'verify_phone' && $request->user()) {
            $user = $request->user();
            if ($user->phone !== $recipient) {
                abort(422, 'This code was not sent to your registered phone number.');
            }
            $user->forceFill(['phone_verified_at' => now()])->save();
        }

        if ($purpose === 'register_phone') {
            $user = User::query()->where('phone', $recipient)->first();
            if ($user && ! $user->phone_verified_at) {
                $user->forceFill(['phone_verified_at' => now()])->save();
            }
        }

        if ($purpose === 'reset_password' || $purpose === 'login') {
            $user = User::query()
                ->where(fn ($q) => $q->where('phone', $recipient)->orWhere('email', $recipient))
                ->first();
        }

        if ($user) {
            AuditLogService::log('otp.verified', $user, null, ['purpose' => $purpose]);
        }

        return response()->json([
            'message' => 'Code verified successfully.',
            'verified' => true,
        ]);
    }
}
