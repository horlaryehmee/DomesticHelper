<?php

namespace Database\Seeders;

use App\Models\TrustScoreRule;
use Illuminate\Database\Seeder;

class TrustScoreRuleSeeder extends Seeder
{
    /**
     * Default scoring rules — all configurable from the admin panel.
     * Score = 50 (neutral base) + Σ active rule points, clamped 0–100.
     */
    private array $rules = [
        ['slug' => 'job-completed', 'name' => 'Verified job completion', 'event_type' => 'job_completed', 'points' => 20, 'description' => 'A completed employment record that the previous employer verified.'],
        ['slug' => 'positive-review', 'name' => 'Positive verified review', 'event_type' => 'positive_review', 'points' => 10, 'description' => 'A moderated, approved review rated 4 to 5 stars.'],
        ['slug' => 'long-term-employment', 'name' => 'Long-term employment (12+ months)', 'event_type' => 'long_term_employment', 'points' => 10, 'description' => 'A verified employment lasting at least 12 months.'],
        ['slug' => 'additional-employment', 'name' => 'Additional verified employment', 'event_type' => 'additional_employment', 'points' => 5, 'description' => 'A second or subsequent verified employment record.'],
        ['slug' => 'identity-verified', 'name' => 'Identity verified (NIN + photo)', 'event_type' => 'identity_verified', 'points' => 5, 'description' => 'NIN and photo verification both approved.'],
        ['slug' => 'verified-complaint', 'name' => 'Verified complaint', 'event_type' => 'complaint_verified', 'points' => -15, 'description' => 'A complaint confirmed by admin review.'],
        ['slug' => 'job-abandonment', 'name' => 'Verified job abandonment', 'event_type' => 'job_abandonment', 'points' => -20, 'description' => 'Job abandonment confirmed by admin review.'],
    ];

    public function run(): void
    {
        foreach ($this->rules as $rule) {
            TrustScoreRule::updateOrCreate(['slug' => $rule['slug']], $rule + ['active' => true]);
        }
    }
}
