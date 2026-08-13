<?php

namespace App\Enums;

enum IdentityVerificationType: string
{
    case Phone = 'phone';
    case Email = 'email';
    case Photo = 'photo';
    case Nin = 'nin';
    case Address = 'address';

    public function label(): string
    {
        return match ($this) {
            self::Phone => 'Phone',
            self::Email => 'Email',
            self::Photo => 'Photo',
            self::Nin => 'NIN',
            self::Address => 'Address',
        };
    }
}
