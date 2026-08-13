<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function forgot(Request $request, OtpService $otp): JsonResponse
    {
        $data = $request->validate([
            'recipient' => ['required', 'string', 'max:255'],
        ]);

        $user = User::query()
            ->where(fn ($q) => $q->where('phone', $data['recipient'])->orWhere('email', $data['recipient']))
            ->first();

        if ($user) {
            $otp->send($data['recipient'], 'reset_password', $user);
        }

        // Same response whether or not the account exists (no enumeration).
        return response()->json(['message' => 'If an account exists with this contact, a reset code has been sent.']);
    }

    /** Change password while logged in. */
    public function change(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        abort_unless(Hash::check($data['current_password'], $user->password), 422, 'Your current password is incorrect.');

        $user->forceFill(['password' => Hash::make($data['new_password'])])->save();

        AuditLogService::log('auth.password_changed', $user);

        return response()->json(['message' => 'Password updated.']);
    }

    public function reset(Request $request, OtpService $otp): JsonResponse
    {
        $data = $request->validate([
            'recipient' => ['required', 'string', 'max:255'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $otp->verify($data['recipient'], 'reset_password', $data['code']);

        $user = User::query()
            ->where(fn ($q) => $q->where('phone', $data['recipient'])->orWhere('email', $data['recipient']))
            ->first();

        abort_unless($user, 422, 'No account was found with this contact.');

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->delete();

        AuditLogService::log('auth.password_reset', $user);

        return response()->json(['message' => 'Password updated. You can now log in.']);
    }
}
