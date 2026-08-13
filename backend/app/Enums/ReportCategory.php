<?php

namespace App\Enums;

enum ReportCategory: string
{
    case Theft = 'theft';
    case Misconduct = 'misconduct';
    case JobAbandonment = 'job_abandonment';
    case PoorPerformance = 'poor_performance';
    case Fraud = 'fraud';
    case PropertyDamage = 'property_damage';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Theft => 'Theft',
            self::Misconduct => 'Misconduct',
            self::JobAbandonment => 'Job abandonment',
            self::PoorPerformance => 'Poor performance',
            self::Fraud => 'Fraud',
            self::PropertyDamage => 'Property damage',
            self::Other => 'Other',
        };
    }
}
