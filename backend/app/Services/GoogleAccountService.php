<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Two\User as GoogleUser;

class GoogleAccountService
{
    public function resolve(GoogleUser $google, string $intent, ?string $role): User
    {
        $raw = $google->getRaw();
        $id = (string) $google->getId();
        $email = strtolower((string) $google->getEmail());
        if (! $id || strlen($id) > 255 || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! filter_var($raw['email_verified'] ?? false, FILTER_VALIDATE_BOOL)) {
            throw ValidationException::withMessages(['google' => 'Google did not provide a verified email address.']);
        }
        $authoritative = str_ends_with($email, '@gmail.com') || ! empty($raw['hd']);

        return DB::transaction(function () use ($google, $raw, $id, $email, $authoritative, $intent, $role) {
            $user = User::withTrashed()->where('google_id', $id)->lockForUpdate()->first();
            if (! $user) {
                $user = User::withTrashed()->where('email', $email)->lockForUpdate()->first();
                if ($user && ($user->google_id || ! $authoritative || ! $user->email_verified_at)) {
                    throw ValidationException::withMessages(['google' => 'An account already uses this email. Please sign in with your existing password.']);
                }
                if (! $user) {
                    if ($intent !== 'register' || ! in_array($role, ['employer', 'helper'], true)) {
                        throw ValidationException::withMessages(['google' => 'No account is connected to this Google account. Please create an account first.']);
                    }
                    $name = trim((string) $google->getName());
                    $parts = explode(' ', $name, 2);
                    $user = User::create(['first_name' => mb_substr($raw['given_name'] ?? ($parts[0] ?: 'Member'), 0, 60), 'last_name' => mb_substr($raw['family_name'] ?? ($parts[1] ?? ''), 0, 60), 'email' => $email, 'user_type' => $role, 'password' => null, 'status' => 'active']);
                    $user->forceFill(['approval_status' => 'draft', 'email_verified_at' => $authoritative ? now() : null, 'details_confirmed_at' => $authoritative ? now() : null])->save();
                    AuditLogService::log('auth.google_registered', $user);
                }
                abort_if($user->trashed() || $user->status->value !== 'active', 403, 'This account is unavailable. Contact support.');
                $user->forceFill(['google_id' => $id])->save();
            }
            abort_if($user->trashed() || $user->status->value !== 'active', 403, 'This account cannot use Google sign-in. Please contact support or use your password.');

            return $user;
        });
    }
}
