<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\MakesUsers;
use Tests\TestCase;

class AccountOnboardingTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_signup_confirmation_submission_and_admin_approval_gate_dashboard(): void
    {
        Storage::fake('private');
        $result = $this->postJson('/api/auth/signup', [
            'first_name' => 'New', 'last_name' => 'Employer', 'email' => 'new@example.com', 'phone' => '08033334444',
            'password' => 'password123', 'password_confirmation' => 'password123', 'user_type' => 'employer',
        ])->assertCreated()->assertJsonPath('user.approval_status', 'draft');
        $user = User::where('email', 'new@example.com')->firstOrFail();
        $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertForbidden();
        $this->postJson('/api/onboarding/confirm', ['confirmed' => true])->assertForbidden();
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->actingAs($user->fresh(), 'sanctum')->postJson('/api/onboarding/confirm', ['confirmed' => true])->assertOk();
        $this->post('/api/onboarding/employer', [
            'profile_type' => 'individual', 'city' => 'Lekki', 'state' => 'Lagos', 'address_line' => '12 Example Street',
            'nin' => '12345678902', 'guarantor_name' => 'Ada', 'guarantor_phone' => '08030000002', 'guarantor_relationship' => 'Sibling',
            'address_proof' => UploadedFile::fake()->create('bill.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('user.approval_status', 'pending');
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/dashboard')->assertForbidden();
        $this->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertForbidden();
        $this->actingAs($this->makeAdmin(), 'sanctum')->getJson('/api/admin/account-verifications')->assertOk()->assertJsonPath('data.0.uuid', $user->uuid);
        $this->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertOk();
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/dashboard')->assertOk();
    }

    public function test_rejected_helper_can_resubmit_and_remains_private_until_approved(): void
    {
        Storage::fake('private');
        Storage::fake('public');
        $user = $this->makeHelper();
        $user->forceFill(['approval_status' => 'draft', 'details_confirmed_at' => now()])->save();
        $skill = $this->seedSkill('Cooking');
        $payload = ['date_of_birth' => '1995-01-01', 'gender' => 'female', 'city' => 'Lekki', 'state' => 'Lagos', 'address_line' => '12 Example Street',
            'nin' => '92345678902', 'guarantor_name' => 'Ada', 'guarantor_phone' => '08030000002', 'guarantor_relationship' => 'Sibling',
            'skills' => [$skill->id], 'years_experience' => 2, 'availability' => 'immediate', 'expected_salary_min' => 60000,
            'address_proof' => UploadedFile::fake()->create('bill.pdf', 100, 'application/pdf')];
        $this->actingAs($user, 'sanctum')->post('/api/onboarding/helper', $payload, ['Accept' => 'application/json'])->assertCreated();
        $this->assertFalse($user->helperProfile->fresh()->is_public);
        $admin = $this->makeAdmin();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'rejected', 'notes' => 'Please provide a clearer document.'])->assertOk();
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/dashboard')->assertForbidden();
        $payload['address_proof'] = UploadedFile::fake()->create('clear-bill.pdf', 100, 'application/pdf');
        $this->post('/api/onboarding/helper', $payload, ['Accept' => 'application/json'])->assertCreated();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertOk();
        $this->assertTrue($user->helperProfile->fresh()->is_public);
    }

    public function test_onboarding_requires_confirmation_and_approval_requires_submission(): void
    {
        $user = $this->makeEmployer();
        $user->forceFill(['approval_status' => 'draft'])->save();
        $this->actingAs($user, 'sanctum')->postJson('/api/onboarding/employer', [])->assertForbidden();
        $this->actingAs($this->makeAdmin(), 'sanctum')->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertStatus(422);
    }
}
