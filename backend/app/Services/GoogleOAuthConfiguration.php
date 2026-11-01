<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;

class GoogleOAuthConfiguration
{
    private const PREFIX = 'google_oauth_';

    public function settings(): array
    {
        $url = $this->value('frontend_url') ?? '';

        return ['enabled' => $this->value('enabled') === '1', 'client_id' => $this->value('client_id') ?? '', 'client_secret_set' => (bool) $this->value('client_secret'), 'frontend_url' => $url, 'redirect_uri' => $url ? rtrim($url, '/').'/api/auth/google/callback' : '', 'configured' => $this->ready()];
    }

    public function ready(): bool
    {
        return $this->value('enabled') === '1' && $this->value('client_id') && $this->value('client_secret') && $this->value('frontend_url');
    }

    public function save(array $data): void
    {
        if ($data['enabled'] && (empty($data['client_id']) || empty($data['frontend_url']) || (empty($data['client_secret']) && (! $this->value('client_secret') || ($data['clear_secret'] ?? false))))) {
            throw ValidationException::withMessages(['client_secret' => 'A client ID, client secret and website URL are required to enable Google sign-in.']);
        }
        foreach (['enabled', 'client_id', 'frontend_url'] as $field) {
            Setting::setValue(self::PREFIX.$field, $field === 'enabled' ? ($data[$field] ? '1' : '0') : rtrim(trim($data[$field] ?? ''), '/'), 'authentication');
        }
        if (! empty($data['client_secret'])) {
            Setting::setValue(self::PREFIX.'client_secret', Crypt::encryptString($data['client_secret']), 'authentication');
        } elseif ($data['clear_secret'] ?? false) {
            Setting::setValue(self::PREFIX.'client_secret', '', 'authentication');
        }
    }

    public function provider(): GoogleProvider
    {
        abort_unless($this->ready(), 503, 'Google sign-in is not configured.');

        return Socialite::buildProvider(GoogleProvider::class, ['client_id' => $this->value('client_id'), 'client_secret' => Crypt::decryptString($this->value('client_secret')), 'redirect' => $this->settings()['redirect_uri']])->enablePKCE();
    }

    private function value(string $field): ?string
    {
        return Setting::getValue(self::PREFIX.$field);
    }
}
