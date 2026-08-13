<?php

namespace Tests\Feature;

use App\Models\Dispute;
use App\Services\TrustScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class DisputeTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_helper_can_dispute_trust_score_event_and_win_reversal(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $admin = $this->makeAdmin();
        $trustScore = app(TrustScoreService::class);

        // Admin verifies a complaint → -15
        $event = $trustScore->recordEvent($helper, 'complaint_verified', null, null, 'Verified complaint', $admin);
        $this->assertEquals(35, $helper->trustScore()->first()->score);

        // Helper disputes it
        $response = $this->actingAs($helper, 'sanctum')->postJson('/api/disputes', [
            'disputable_type' => 'trust_score_event',
            'disputable_uuid' => $event->uuid,
            'reason' => 'Incorrect trust score deduction',
            'explanation' => 'The complaint was based on incorrect information and I have documents proving otherwise.',
        ]);

        $response->assertCreated();
        $dispute = Dispute::first();
        $this->assertEquals('submitted', $dispute->status->value);

        // Admin upholds → event reversed, score restored
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/disputes/{$dispute->uuid}/decide", [
                'uphold' => true,
                'decision' => 'Dispute upheld after reviewing the submitted evidence. Score restored.',
            ])
            ->assertOk();

        $this->assertEquals(50, $helper->trustScore()->first()->score);
    }

    public function test_helper_cannot_dispute_someone_elses_event(): void
    {
        $this->seedRules();
        $helper = $this->makeHelper();
        $otherHelper = $this->makeHelper(['nin' => '11111111111']);
        $admin = $this->makeAdmin();

        $event = app(TrustScoreService::class)->recordEvent($helper, 'complaint_verified', null, null, 'Verified', $admin);

        $this->actingAs($otherHelper, 'sanctum')
            ->postJson('/api/disputes', [
                'disputable_type' => 'trust_score_event',
                'disputable_uuid' => $event->uuid,
                'reason' => 'Not mine',
                'explanation' => 'This event does not belong to my account.',
            ])
            ->assertForbidden();
    }

    public function test_employers_cannot_submit_disputes(): void
    {
        $employer = $this->makeEmployer();

        $this->actingAs($employer, 'sanctum')
            ->postJson('/api/disputes', [
                'disputable_type' => 'review',
                'disputable_uuid' => 'anything',
                'reason' => 'test',
                'explanation' => 'This is a long enough explanation to pass validation.',
            ])
            ->assertForbidden();
    }
}
