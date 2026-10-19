<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactInquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_can_submit_and_admin_can_review_an_inquiry(): void
    {
        $payload = [
            'audience' => 'helper',
            'topic' => 'account',
            'name' => 'Ada Sample',
            'email' => 'ada@example.com',
            'subject' => 'Cannot access my account',
            'message' => 'I need help getting back into my account.',
        ];

        $this->postJson('/api/contact', $payload)->assertCreated()->assertJsonPath('reference', 'HS-1');
        $this->assertDatabaseHas('contact_inquiries', ['email' => 'ada@example.com', 'status' => 'new']);
        $this->getJson('/api/admin/contact-inquiries')->assertUnauthorized();

        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/contact-inquiries')
            ->assertOk()->assertJsonPath('data.data.0.subject', $payload['subject']);
        $this->patchJson('/api/admin/contact-inquiries/1', ['status' => 'resolved'])->assertOk();
        $this->assertDatabaseHas('contact_inquiries', ['id' => 1, 'status' => 'resolved']);
    }

    public function test_contact_form_rejects_invalid_or_spam_payloads(): void
    {
        $this->postJson('/api/contact', [
            'audience' => 'unknown', 'topic' => 'account', 'name' => 'A',
            'email' => 'invalid', 'subject' => 'Hi', 'message' => 'Short', 'website' => 'spam',
        ])->assertUnprocessable();
    }
}
