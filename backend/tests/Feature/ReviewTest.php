<?php

namespace Tests\Feature;

use App\Enums\EmploymentRecordStatus;
use App\Enums\RecordVerificationStatus;
use App\Models\EmploymentRecord;
use App\Models\Review;
use App\Models\TrustScoreEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    private function makeCompletedEmployment($employer, $helper, bool $verified = true): EmploymentRecord
    {
        return EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => 'Nanny',
            'start_date' => now()->subMonths(10),
            'end_date' => now()->subDay(),
            'status' => EmploymentRecordStatus::Completed,
            'verification_status' => $verified ? RecordVerificationStatus::Verified : RecordVerificationStatus::Unverified,
        ]);
    }

    public function test_review_requires_real_employment_relationship(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $otherEmployer = $this->makeEmployer();

        $record = $this->makeCompletedEmployment($employer, $helper);

        // Employer with no relationship to the record → forbidden
        $this->actingAs($otherEmployer, 'sanctum')
            ->postJson('/api/reviews', [
                'helper_uuid' => $helper->uuid,
                'employment_record_uuid' => $record->uuid,
                'rating' => 5,
                'feedback' => 'She was excellent and very professional.',
            ])
            ->assertForbidden();
    }

    public function test_review_starts_pending_and_is_moderated_before_public(): void
    {
        $this->seedRules();
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $admin = $this->makeAdmin();
        $record = $this->makeCompletedEmployment($employer, $helper);

        $response = $this->actingAs($employer, 'sanctum')->postJson('/api/reviews', [
            'helper_uuid' => $helper->uuid,
            'employment_record_uuid' => $record->uuid,
            'rating' => 5,
            'feedback' => 'Extremely reliable and hardworking. Highly recommended.',
        ]);

        $response->assertCreated();
        $reviewUuid = $response->json('data.uuid');

        // Pending review must NOT appear on the public profile
        $this->getJson("/api/helpers/{$helper->uuid}")
            ->assertJsonCount(0, 'reviews');

        // No trust event yet
        $this->assertEquals(0, TrustScoreEvent::where('event_type', 'positive_review')->count());

        // Admin approves → now public + trust event awarded
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/reviews/{$reviewUuid}/moderate", ['status' => 'approved'])
            ->assertOk();

        $this->getJson("/api/helpers/{$helper->uuid}")
            ->assertJsonCount(1, 'reviews');

        $this->assertEquals(1, TrustScoreEvent::where('event_type', 'positive_review')->count());
    }

    public function test_duplicate_review_for_same_employment_is_blocked(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $record = $this->makeCompletedEmployment($employer, $helper);

        $payload = [
            'helper_uuid' => $helper->uuid,
            'employment_record_uuid' => $record->uuid,
            'rating' => 4,
            'feedback' => 'Good worker overall, dependable and honest.',
        ];

        $this->actingAs($employer, 'sanctum')->postJson('/api/reviews', $payload)->assertCreated();
        $this->actingAs($employer, 'sanctum')->postJson('/api/reviews', $payload)->assertStatus(422);
    }

    public function test_helper_can_respond_to_review(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $record = $this->makeCompletedEmployment($employer, $helper);
        $review = Review::create([
            'helper_id' => $helper->id,
            'employer_id' => $employer->id,
            'employment_record_id' => $record->id,
            'rating' => 5,
            'feedback' => 'Wonderful helper, very professional.',
            'status' => 'approved',
        ]);

        $this->actingAs($helper, 'sanctum')
            ->postJson("/api/reviews/{$review->uuid}/respond", ['content' => 'Thank you!'])
            ->assertCreated();

        $this->assertDatabaseHas('review_responses', ['review_id' => $review->id]);
    }

    public function test_employer_cannot_view_someone_elses_review(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $record = $this->makeCompletedEmployment($employer, $helper);
        $review = Review::create([
            'helper_id' => $helper->id,
            'employer_id' => $employer->id,
            'employment_record_id' => $record->id,
            'rating' => 5,
            'feedback' => 'Excellent service throughout.',
            'status' => 'approved',
        ]);

        $stranger = $this->makeEmployer();
        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/reviews/{$review->uuid}")
            ->assertForbidden();
    }
}
