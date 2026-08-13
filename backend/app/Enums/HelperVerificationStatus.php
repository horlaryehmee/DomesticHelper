<?php

namespace App\Enums;

enum HelperVerificationStatus: string
{
    case Unverified = 'unverified';
    case UnderReview = 'under_review';
    case Verified = 'verified';
    case Flagged = 'flagged';

    public function label(): string
    {
        return match ($this) {
            self::Unverified => 'Unverified',
            self::UnderReview => 'Under Review',
            self::Verified => 'Verified',
            self::Flagged => 'Flagged Concern',
        };
    }
}
