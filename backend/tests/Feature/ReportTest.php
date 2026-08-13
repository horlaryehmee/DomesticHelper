<?php

namespace Tests\Feature;

use App\Enums\EmploymentRecordStatus;
use App\Enums\RecordVerificationStatus;
use App\Enums\ReportOutcome;
use App\Models\EmploymentRecord;
use App\Models\Report;
use App\Models\TrustScoreEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    private function makeEmployment($employer, $helper): EmploymentRecord
    {
        return EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => 'Housekeeper',
            'start_date' => now()->subMonths(6),
            'end_date' => now()->subDay(),
            'status' => EmploymentRecordStatus::Completed,
            'verification_status' => RecordVerificationStatus::Verified,
        ]);
    }

    public function test_report_submission_never_changes_trust_score(): void
    {
        $this->seedRules();
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $record = $this->makeEmployment($employer, $helper);

        $scoreBefore = $helper->trustScore()->firstOrCreate(
            ['helper_id' => $helper->id],
            ['score' => 50, 'category' => 'moderate', 'events_count' => 0],
        )->score;

        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/reports', [
            'helper_uuid' => $helper->uuid,
            'employment_record_uuid' => $record->uuid,
            'category' => 'theft',
            'description' => 'Some household items went missing during the employment period.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reports', ['reporter_id' => $employer->id, 'helper_id' => $helper->id]);

        $this->assertEquals($scoreBefore, $helper->trustScore()->first()->score);
        $this->assertEquals(0, TrustScoreEvent::count());
    }

    public function test_helper_is_notified_and_can_respond(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $record = $this->makeEmployment($employer, $helper);

        $this->actingAs($employer, 'sanctum')->postJson('/api/reports', [
            'helper_uuid' => $helper->uuid,
            'employment_record_uuid' => $record->uuid,
            'category' => 'misconduct',
            'description' => 'Repeated unprofessional conduct during the employment.',
        ]);

        // Helper has a notification about the report
        $this->actingAs($helper, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk();

        $report = Report::first();
        $this->assertNotNull($helper->notifications()->where('data->type', 'report_submitted')->first());

        // Helper responds
        $this->actingAs($helper, 'sanctum')
            ->postJson("/api/reports/{$report->uuid}/respond", [
                'response' => 'This is not an accurate description of what happened. I can provide my own evidence.',
            ])
            ->assertOk();

        $this->assertEquals('under_review', $report->fresh()->status->value);
    }

    public function test_only_admin_decision_creates_trust_score_event(): void
    {
        $this->seedRules();
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $admin = $this->makeAdmin();
        $record = $this->makeEmployment($employer, $helper);

        $report = Report::create([
            'helper_id' => $helper->id,
            'reporter_id' => $employer->id,
            'employment_record_id' => $record->id,
            'category' => 'theft',
            'description' => 'Items went missing during the employment period.',
            'status' => 'submitted',
        ]);

        // Employer cannot decide
        $this->actingAs($employer, 'sanctum')
            ->postJson("/api/admin/reports/{$report->uuid}/decide", ['outcome' => 'verified', 'decision' => 'n/a'])
            ->assertForbidden();

        // Admin marks unsubstantiated → NO score event
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/reports/{$report->uuid}/decide", [
                'outcome' => ReportOutcome::Unsubstantiated->value,
                'decision' => 'No supporting evidence was provided to substantiate this report.',
            ])
            ->assertOk();

        $this->assertEquals(0, TrustScoreEvent::count());
        $this->assertEquals(50, $this->scoreOf($helper));

        // New report, admin verifies → negative event applied
        $report2 = Report::create([
            'helper_id' => $helper->id,
            'reporter_id' => $employer->id,
            'employment_record_id' => $record->id,
            'category' => 'theft',
            'description' => 'Additional evidence confirms items went missing.',
            'status' => 'submitted',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/reports/{$report2->uuid}/decide", [
                'outcome' => ReportOutcome::Verified->value,
                'decision' => 'Evidence reviewed and verified by the team.',
            ])
            ->assertOk();

        $this->assertEquals(1, TrustScoreEvent::where('event_type', 'complaint_verified')->count());
        $this->assertEquals(35, $this->scoreOf($helper)); // 50 - 15
    }

    public function test_helpers_cannot_see_other_helpers_reports(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $otherHelper = $this->makeHelper(['nin' => '11111111111']);
        $record = $this->makeEmployment($employer, $helper);

        $report = Report::create([
            'helper_id' => $helper->id,
            'reporter_id' => $employer->id,
            'employment_record_id' => $record->id,
            'category' => 'other',
            'description' => 'Internal concern recorded for review.',
            'status' => 'submitted',
        ]);

        $this->actingAs($otherHelper, 'sanctum')
            ->getJson("/api/reports/{$report->uuid}")
            ->assertForbidden();
    }
}
