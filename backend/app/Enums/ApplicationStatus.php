<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case Applied = 'applied';
    case Shortlisted = 'shortlisted';
    case Rejected = 'rejected';
    case Interview = 'interview';
    case Hired = 'hired';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
