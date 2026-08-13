<?php

namespace App\Enums;

enum ProfileType: string
{
    case Individual = 'individual';
    case Agency = 'agency';

    public function label(): string
    {
        return match ($this) {
            self::Individual => 'Individual',
            self::Agency => 'Agency',
        };
    }
}
