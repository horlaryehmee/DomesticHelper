<?php

namespace App\Enums;

enum Availability: string
{
    case Immediate = 'immediate';
    case WithinOneWeek = 'within_1_week';
    case WithinTwoWeeks = 'within_2_weeks';
    case WithinOneMonth = 'within_1_month';
    case Negotiable = 'negotiable';

    public function label(): string
    {
        return match ($this) {
            self::Immediate => 'Immediately available',
            self::WithinOneWeek => 'Within 1 week',
            self::WithinTwoWeeks => 'Within 2 weeks',
            self::WithinOneMonth => 'Within 1 month',
            self::Negotiable => 'Negotiable',
        };
    }
}
