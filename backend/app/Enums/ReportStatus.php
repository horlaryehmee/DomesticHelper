<?php

namespace App\Enums;

enum ReportStatus: string
{
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case AwaitingHelperResponse = 'awaiting_helper_response';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Submitted',
            self::UnderReview => 'Under review',
            self::AwaitingHelperResponse => 'Awaiting helper response',
            self::Closed => 'Closed',
        };
    }
}
