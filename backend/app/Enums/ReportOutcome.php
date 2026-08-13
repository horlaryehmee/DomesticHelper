<?php

namespace App\Enums;

enum ReportOutcome: string
{
    case Unsubstantiated = 'unsubstantiated';
    case Resolved = 'resolved';
    case Verified = 'verified';
    case Dismissed = 'dismissed';
    case PartiallyVerified = 'partially_verified';
    case Escalated = 'escalated';

    public function label(): string
    {
        return match ($this) {
            self::Unsubstantiated => 'Unsubstantiated',
            self::Resolved => 'Resolved',
            self::Verified => 'Verified',
            self::Dismissed => 'Dismissed',
            self::PartiallyVerified => 'Partially verified',
            self::Escalated => 'Escalated',
        };
    }
}
