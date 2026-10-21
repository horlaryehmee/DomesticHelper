<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Str;

class ComingSoon
{
    public function enabled(): bool
    {
        return Setting::getValue('coming_soon_enabled', '0') === '1';
    }

    public function setEnabled(bool $enabled): void
    {
        Setting::setValue('coming_soon_enabled', $enabled ? '1' : '0', 'site', 'Coming soon enabled');
    }

    public function previewToken(): string
    {
        $nonce = Setting::getValue('coming_soon_preview_nonce');

        if (! is_string($nonce) || $nonce === '') {
            $nonce = Str::random(48);
            Setting::setValue('coming_soon_preview_nonce', $nonce, 'site', 'Coming soon preview nonce');
        }

        return hash_hmac('sha256', $nonce, (string) config('app.key'));
    }

    public function rotatePreviewToken(): string
    {
        Setting::setValue('coming_soon_preview_nonce', Str::random(48), 'site', 'Coming soon preview nonce');

        return $this->previewToken();
    }

    public function hasPreviewAccess(?string $token): bool
    {
        $nonce = Setting::getValue('coming_soon_preview_nonce');

        return is_string($nonce)
            && $nonce !== ''
            && is_string($token)
            && preg_match('/\A[a-f0-9]{64}\z/', $token) === 1
            && hash_equals(hash_hmac('sha256', $nonce, (string) config('app.key')), $token);
    }
}
