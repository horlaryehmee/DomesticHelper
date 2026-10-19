<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;

class SmtpConfiguration
{
    private const PREFIX = 'mail_smtp_';

    public function publicSettings(): array
    {
        return [
            'enabled' => $this->value('enabled') === '1',
            'host' => $this->value('host') ?? '',
            'port' => (int) ($this->value('port') ?? 587),
            'scheme' => $this->value('scheme') ?? 'smtp',
            'username' => $this->value('username') ?? '',
            'password_set' => (bool) $this->value('password'),
            'from_address' => $this->value('from_address') ?? '',
            'from_name' => $this->value('from_name') ?? 'Hire Safe',
        ];
    }

    public function save(array $data): void
    {
        foreach (['enabled', 'host', 'port', 'scheme', 'username', 'from_address', 'from_name'] as $field) {
            $value = $field === 'enabled' ? ($data[$field] ? '1' : '0') : (string) ($data[$field] ?? '');
            Setting::setValue(self::PREFIX.$field, $value, 'mail');
        }

        if ($data['clear_password'] ?? false) {
            Setting::setValue(self::PREFIX.'password', '', 'mail');
        } elseif (! empty($data['password'])) {
            Setting::setValue(self::PREFIX.'password', Crypt::encryptString($data['password']), 'mail');
        }
    }

    public function apply(): void
    {
        if ($this->value('enabled') !== '1') {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.scheme' => $this->value('scheme') ?: 'smtp',
            'mail.mailers.smtp.url' => null,
            'mail.mailers.smtp.host' => $this->value('host'),
            'mail.mailers.smtp.port' => (int) $this->value('port'),
            'mail.mailers.smtp.username' => $this->value('username') ?: null,
            'mail.mailers.smtp.password' => $this->value('password') ? Crypt::decryptString($this->value('password')) : null,
            'mail.from.address' => $this->value('from_address'),
            'mail.from.name' => $this->value('from_name'),
        ]);
    }

    private function value(string $field): ?string
    {
        return Setting::getValue(self::PREFIX.$field);
    }
}
