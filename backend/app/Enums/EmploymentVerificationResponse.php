<?php

namespace App\Enums;

enum EmploymentVerificationResponse: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case UnableToConfirm = 'unable_to_confirm';
    case Disputed = 'disputed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Confirmed => 'Confirmed',
            self::UnableToConfirm => 'Unable to confirm',
            self::Disputed => 'Disputed',
        };
    }
}
