<?php

namespace App\Services;

use App\Models\EmailVerificationCode as Otp;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class EmailVerificationService
{
    public function send(User $user): void
    {
        abort_unless($user->email, 422, 'An email address is required.');
        if ($user->email_verified_at) {
            return;
        }
        $key = 'email-verification:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages(['email' => 'Too many code requests. Please wait 15 minutes before trying again.']);
        }
        RateLimiter::hit($key, 900);
        $code = (string) random_int(100000, 999999);
        DB::transaction(function () use ($user, $code) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            Otp::where('user_id', $user->id)->where('purpose', 'verify_email')->whereNull('verified_at')->update(['expires_at' => now()]);
            Otp::create(['user_id' => $user->id, 'recipient' => $user->email, 'purpose' => 'verify_email', 'code_hash' => Hash::make($code), 'expires_at' => now()->addMinutes(10)]);
        });
        Mail::raw("Your Hire Safe email verification code is: {$code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.", fn ($message) => $message->to($user->email)->subject('Confirm your Hire Safe email'));
    }

    public function verify(User $user, string $code): void
    {
        $error = DB::transaction(function () use ($user, $code) {
            $account = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($account->email_verified_at) {
                return null;
            }
            $otp = Otp::where('user_id', $account->id)->where('recipient', $account->email)->where('purpose', 'verify_email')->latest('id')->lockForUpdate()->first();
            if (! $otp || $otp->verified_at || $otp->isExpired()) {
                return 'This code is expired or unavailable. Request a new code.';
            }
            if ($otp->attemptsExceeded()) {
                return 'Too many incorrect attempts. Request a new code.';
            }
            $otp->increment('attempts');
            if (! Hash::check($code, $otp->code_hash)) {
                return 'Incorrect verification code. Please try again.';
            }
            $otp->forceFill(['verified_at' => now()])->save();
            $account->forceFill(['email_verified_at' => now(), 'details_confirmed_at' => now()])->save();
            AuditLogService::log('auth.email_verified', $account);

            return null;
        });
        if ($error) {
            throw ValidationException::withMessages(['code' => $error]);
        }
    }
}
