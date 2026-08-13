<?php

namespace App\Enums;

enum EmploymentType: string
{
    case FullTime = 'full_time';
    case PartTime = 'part_time';
    case LiveIn = 'live_in';
    case Any = 'any';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::FullTime => 'Full time',
            self::PartTime => 'Part time',
            self::LiveIn => 'Live-in',
            self::Any => 'Any',
            self::Other => 'Other',
        };
    }
}
