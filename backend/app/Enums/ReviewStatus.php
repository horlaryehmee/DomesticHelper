<?php

namespace App\Enums;

enum ReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Disputed = 'disputed';
    case Removed = 'removed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
