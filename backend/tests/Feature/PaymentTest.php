<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\VerificationReportStatus;
use App\Models\Payment;
use App\Models\VerificationReport;
use App\Services\Payments\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_purchase_creates_pending_report_and_sandbox_checkout(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();

        $response = $this->actingAs($employer, 'sanctum')
            ->postJson('/api/verification-reports', [
                'helper_uuid' => $helper->uuid,
                'provider' => 'sandbox',
            ]);

        $response->assertCreated();
        $this->assertArrayHasKey('authorization_url', $response->json('data'));

        $report = VerificationReport::first();
        $this->assertEquals(VerificationReportStatus::PendingPayment, $report->status);
        $this->assertNotNull($report->payment_id);
    }

    public function test_sandbox_simulation_generates_report_only_in_debug(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config(['app.debug' => true]);

        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $report = VerificationReport::create([
            'helper_id' => $helper->id,
            'purchased_by' => $employer->id,
            'status' => VerificationReportStatus::PendingPayment,
        ]);
        $payment = Payment::create([
            'user_id' => $employer->id,
            'payable_type' => VerificationReport::class,
            'payable_id' => $report->id,
            'provider' => 'sandbox',
            'provider_reference' => 'sandbox-'.$report->uuid,
            'amount' => 500000,
            'currency' => 'NGN',
            'status' => PaymentStatus::Pending,
        ]);
        $report->update(['payment_id' => $payment->id]);

        // Another user cannot simulate the payment
        $this->actingAs($this->makeEmployer(), 'sanctum')
            ->postJson("/api/payments/{$payment->uuid}/sandbox-complete")
            ->assertForbidden();

        // Owner simulates success → payment successful + report generated
        $this->actingAs($employer, 'sanctum')
            ->postJson("/api/payments/{$payment->uuid}/sandbox-complete")
            ->assertOk();

        $this->assertEquals(PaymentStatus::Successful, $payment->fresh()->status);
        $this->assertEquals(VerificationReportStatus::Generated, $report->fresh()->status);
        $this->assertNotNull($report->fresh()->snapshot);
        $this->assertNotNull($report->fresh()->generated_at);
    }

    public function test_webhook_with_invalid_signature_is_rejected(): void
    {
        $response = $this->postJson('/api/payments/webhook/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => 'whatever'],
        ], ['x-paystack-signature' => 'bad-signature']);

        $response->assertStatus(401);
    }

    public function test_report_is_only_visible_to_purchaser(): void
    {
        $employer = $this->makeEmployer();
        $otherEmployer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $report = VerificationReport::create([
            'helper_id' => $helper->id,
            'purchased_by' => $employer->id,
            'status' => VerificationReportStatus::Generated,
            'snapshot' => ['trust_score' => ['score' => 85, 'category' => 'high']],
            'generated_at' => now(),
        ]);

        $this->actingAs($employer, 'sanctum')
            ->getJson("/api/verification-reports/{$report->uuid}")
            ->assertOk()
            ->assertJsonPath('data.snapshot.trust_score.score', 85);

        $this->actingAs($otherEmployer, 'sanctum')
            ->getJson("/api/verification-reports/{$report->uuid}")
            ->assertForbidden();
    }

    public function test_unauthenticated_cannot_access_report(): void
    {
        $employer = $this->makeEmployer();
        $helper = $this->makeHelper();
        $report = VerificationReport::create([
            'helper_id' => $helper->id,
            'purchased_by' => $employer->id,
            'status' => VerificationReportStatus::Generated,
        ]);

        $this->getJson("/api/verification-reports/{$report->uuid}")->assertStatus(401);
    }
}
