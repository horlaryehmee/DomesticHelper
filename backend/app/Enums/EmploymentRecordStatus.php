<?php

namespace App\Enums;

enum EmploymentRecordStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Completed = 'completed';
    case Terminated = 'terminated';
    case Disputed = 'disputed';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
