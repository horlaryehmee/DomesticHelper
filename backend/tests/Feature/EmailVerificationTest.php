<?php

namespace Tests\Feature;

use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private array $codes = [];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::shouldReceive('raw')->andReturnUsing(function ($text, $callback) {
            preg_match('/code is: ([0-9]{6})/', $text, $matches);
            $this->codes[] = $matches[1];
        });
    }

    private function signup(): User
    {
        $this->postJson('/api/auth/signup', ['first_name' => 'Ada', 'last_name' => 'Test', 'email' => 'ada@example.com', 'phone' => '08031112222', 'password' => 'password123', 'password_confirmation' => 'password123', 'user_type' => 'employer'])->assertCreated()->assertJsonPath('verification_email_sent', true)->assertJsonMissingPath('debug_code');

        return User::where('email', 'ada@example.com')->firstOrFail();
    }

    public function test_signup_sends_hashed_code_and_requires_email_before_onboarding(): void
    {
        $user = $this->signup();
        $this->assertCount(1, $this->codes);
        $record = EmailVerificationCode::firstOrFail();
        $this->assertTrue(Hash::check($this->codes[0], $record->code_hash));
        $this->actingAs($user, 'sanctum')->postJson('/api/onboarding/employer', [])->assertForbidden();
        $this->postJson('/api/auth/register/employer', [])->assertForbidden();
        $this->postJson('/api/onboarding/confirm', ['confirmed' => true])->assertForbidden();
        $this->postJson('/api/auth/email/verify', ['code' => $this->codes[0]])->assertOk()->assertJsonPath('user.email_verified', true)->assertJsonPath('user.details_confirmed', true);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->actingAs($user->fresh(), 'sanctum')->postJson('/api/onboarding/employer', [])->assertUnprocessable();
        $this->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_wrong_expired_and_replaced_codes_are_rejected(): void
    {
        $user = $this->signup();
        $this->actingAs($user, 'sanctum');
        $this->postJson('/api/auth/email/verify', ['code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/auth/email/send')->assertOk();
        $this->postJson('/api/auth/email/verify', ['code' => $this->codes[0]])->assertUnprocessable();
        $this->travel(11)->minutes();
        $this->postJson('/api/auth/email/verify', ['code' => $this->codes[1]])->assertUnprocessable();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_code_is_bound_to_account_and_attempts_are_limited(): void
    {
        $user = $this->signup();
        $other = User::factory()->create(['email_verified_at' => null, 'approval_status' => 'draft']);
        $this->actingAs($other, 'sanctum')->postJson('/api/auth/email/verify', ['code' => $this->codes[0], 'email' => $user->email])->assertUnprocessable();
        $this->actingAs($user, 'sanctum');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/email/verify', ['code' => '000000'])->assertUnprocessable();
        }
        $this->postJson('/api/auth/email/verify', ['code' => $this->codes[0]])->assertUnprocessable();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_resend_is_limited_and_legacy_registration_requires_authentication(): void
    {
        $this->postJson('/api/auth/register/employer', [])->assertUnauthorized();
        $user = $this->signup();
        $this->actingAs($user, 'sanctum');
        $this->postJson('/api/auth/email/send')->assertOk();
        $this->postJson('/api/auth/email/send')->assertOk();
        $this->postJson('/api/auth/email/send')->assertUnprocessable();
    }
}
