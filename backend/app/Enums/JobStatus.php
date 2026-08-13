<?php

namespace App\Enums;

enum JobStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Filled = 'filled';
    case Closed = 'closed';
    case Reported = 'reported';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
