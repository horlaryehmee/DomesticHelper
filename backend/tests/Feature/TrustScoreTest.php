<?php

namespace Tests\Feature;

use App\Enums\RecordVerificationStatus;
use App\Models\EmploymentRecord;
use App\Models\TrustScoreEvent;
use App\Services\TrustScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class TrustScoreTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_score_starts_at_neutral_base(): void
    {
        $helper = $this->makeHelper();
        $score = \App\Models\TrustScore::firstOrCreate(
            ['helper_id' => $helper->id],
            ['score' => TrustScoreService::BASE_SCORE, 'category' => 'moderate', 'events_count' => 0],
        );

        $this->assertEquals(TrustScoreService::BASE_SCORE, $score->score);
        $this->assertEquals('moderate', $score->category->value);
    }

    public function test_events_accumulate_and_clamp_at_100(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $service = app(TrustScoreService::class);

        $service->recordEvent($helper, 'job_completed');
        $service->recordEvent($helper, 'job_completed');
        $service->recordEvent($helper, 'job_completed');
        $service->recordEvent($helper, 'positive_review');

        $this->assertEquals(100, $helper->trustScore()->first()->score);
        $this->assertEquals('high', $helper->trustScore()->first()->category->value);
        $this->assertEquals(4, TrustScoreEvent::count());
    }

    public function test_score_never_goes_below_zero(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $service = app(TrustScoreService::class);

        $service->recordEvent($helper, 'job_abandonment');
        $service->recordEvent($helper, 'job_abandonment');
        $service->recordEvent($helper, 'job_abandonment');
        $service->recordEvent($helper, 'complaint_verified');

        $this->assertEquals(0, $helper->trustScore()->first()->score);
        $this->assertEquals('needs_review', $helper->trustScore()->first()->category->value);
    }

    public function test_every_event_creates_audit_record(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        app(TrustScoreService::class)->recordEvent($helper, 'job_completed');

        $this->assertDatabaseHas('audit_logs', ['action' => 'trust_score.event_created']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'trust_score.recalculated']);
    }

    public function test_rule_change_recalculates_all_scores(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $service = app(TrustScoreService::class);
        $service->recordEvent($helper, 'job_completed');
        $this->assertEquals(70, $helper->trustScore()->first()->score);

        // Admin changes the rule points from 20 → 40
        $rule = \App\Models\TrustScoreRule::where('event_type', 'job_completed')->first();
        $rule->update(['points' => 40]);

        $service->recalculateAll();

        $this->assertEquals(90, $helper->trustScore()->first()->score);
    }

    public function test_employment_verification_awards_trust_events_once(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $employer = $this->makeEmployer();

        $record = EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => 'Nanny',
            'start_date' => now()->subYears(2),
            'end_date' => now()->subDay(),
            'status' => 'completed',
            'verification_status' => RecordVerificationStatus::Verified,
        ]);

        $service = app(\App\Services\EmploymentService::class);

        // complete() awards events; calling again must not duplicate
        $service->complete($record, ['end_date' => now()->subDay()->toDateString(), 'termination_reason' => 'Contract completed', 'performance_rating' => 5]);
        $service->complete($record, ['end_date' => now()->subDay()->toDateString(), 'termination_reason' => 'Contract completed', 'performance_rating' => 5]);

        $this->assertEquals(2, TrustScoreEvent::count()); // job_completed + long_term_employment
    }
}
