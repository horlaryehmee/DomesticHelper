<?php

namespace App\Services;

use App\Models\Otp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OtpService
{
    public const EXPIRY_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const MAX_SENDS_PER_15_MIN = 3;

    /**
     * Generate and deliver an OTP to a phone number or email address.
     * Returns the plain code for dev/logging only — the stored value is hashed.
     */
    public function send(string $recipient, string $purpose, ?User $user = null): string
    {
        $this->guardAgainstSpam($recipient, $purpose);

        $code = (string) random_int(100000, 999999);

        Otp::create([
            'user_id' => $user?->id,
            'recipient' => $recipient,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
        ]);

        $this->deliver($recipient, $code, $purpose);

        return $code;
    }

    public function verify(string $recipient, string $purpose, string $code, ?User $user = null): Otp
    {
        $otp = Otp::query()
            ->where('recipient', $recipient)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->latest('id')
            ->first();

        if (! $otp) {
            throw ValidationException::withMessages(['code' => 'No active code found. Please request a new one.']);
        }

        if ($otp->isExpired()) {
            throw ValidationException::withMessages(['code' => 'This code has expired. Please request a new one.']);
        }

        if ($otp->attemptsExceeded()) {
            throw ValidationException::withMessages(['code' => 'Too many incorrect attempts. Please request a new code.']);
        }

        $otp->increment('attempts');

        if (! Hash::check($code, $otp->code_hash)) {
            $remaining = self::MAX_ATTEMPTS - $otp->attempts;
            throw ValidationException::withMessages(['code' => "Incorrect code. {$remaining} attempts remaining."]);
        }

        $otp->forceFill(['verified_at' => now()])->save();

        return $otp;
    }

    private function guardAgainstSpam(string $recipient, string $purpose): void
    {
        $key = "otp:{$purpose}:{$recipient}";
        if (RateLimiter::tooManyAttempts($key, self::MAX_SENDS_PER_15_MIN)) {
            throw ValidationException::withMessages(['recipient' => 'Too many code requests. Please wait a few minutes and try again.']);
        }
        RateLimiter::hit($key, 900);
    }

    private function deliver(string $recipient, string $code, string $purpose): void
    {
        $isEmail = filter_var($recipient, FILTER_VALIDATE_EMAIL);

        if ($isEmail) {
            if (config('mail.default') === 'log' || app()->environment('local')) {
                Log::info("OTP for {$recipient} ({$purpose}): {$code}");
                return;
            }
            Mail::raw("Your Domestic Helper verification code is: {$code}. It expires in 10 minutes.", fn ($m) => $m->to($recipient)->subject('Your verification code'));
            return;
        }

        // Phone — SMS via Termii when configured, otherwise log (dev).
        $apiKey = config('services.termii.key');
        if ($apiKey) {
            app(SmsService::class)->send($recipient, "Your Domestic Helper verification code is {$code}. It expires in 10 minutes.");
        } else {
            Log::info("OTP for {$recipient} ({$purpose}): {$code}");
        }
    }
}
