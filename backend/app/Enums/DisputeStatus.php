<?php

namespace App\Enums;

enum DisputeStatus: string
{
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case AwaitingResponse = 'awaiting_response';
    case Resolved = 'resolved';
    case Rejected = 'rejected';
    case Escalated = 'escalated';

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
