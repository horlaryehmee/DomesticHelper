<?php

namespace App\Enums;

enum TrustCategory: string
{
    case High = 'high';
    case Moderate = 'moderate';
    case NeedsReview = 'needs_review';

    public function label(): string
    {
        return match ($this) {
            self::High => 'High Trust',
            self::Moderate => 'Moderate Trust',
            self::NeedsReview => 'Needs Review',
        };
    }

    public static function fromScore(int $score): self
    {
        return match (true) {
            $score >= 80 => self::High,
            $score >= 50 => self::Moderate,
            default => self::NeedsReview,
        };
    }
}
