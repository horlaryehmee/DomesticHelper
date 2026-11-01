<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
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
            'nin' => '12345678902', 'guarantor_name' => 'Ada', 'guarantor_phone' => '08030000002', 'guarantor_relationship' => 'Sibling', 'guarantor_2_name' => 'Second Guarantor', 'guarantor_2_phone' => '08039999999', 'guarantor_2_relationship' => 'Former employer',
            'address_proof' => UploadedFile::fake()->create('bill.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('user.approval_status', 'pending');
        $details = DB::table('registration_verification_details')->where('user_id', $user->id)->first();
        $this->assertNotEquals('Second Guarantor', $details->guarantor_2_name_encrypted);
        $this->assertEquals('Second Guarantor', Crypt::decryptString($details->guarantor_2_name_encrypted));
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/dashboard')->assertForbidden();
        $this->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertForbidden();
        $this->actingAs($this->makeAdmin(), 'sanctum')->getJson('/api/admin/account-verifications')->assertOk()->assertJsonPath('data.0.uuid', $user->uuid);
        $this->getJson("/api/admin/users/{$user->uuid}/registration-details")->assertOk()->assertJsonPath('data.guarantor_2_name', 'Second Guarantor')->assertJsonPath('data.guarantor_2_phone', '08039999999');
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
            'nin' => '92345678902', 'guarantor_name' => 'Ada', 'guarantor_phone' => '08030000002', 'guarantor_relationship' => 'Sibling', 'guarantor_2_name' => 'Second Guarantor', 'guarantor_2_phone' => '08039999999', 'guarantor_2_relationship' => 'Former employer',
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

    public function test_both_roles_require_second_guarantor_and_distinct_contacts(): void
    {
        foreach (['employer', 'helper'] as $type) {
            $user = User::factory()->create(['user_type' => $type, 'email_verified_at' => now(), 'details_confirmed_at' => now(), 'approval_status' => 'draft']);
            $this->actingAs($user, 'sanctum')->postJson("/api/onboarding/{$type}", [])
                ->assertUnprocessable()->assertJsonValidationErrors(['guarantor_2_name', 'guarantor_2_phone', 'guarantor_2_relationship']);
            $this->postJson("/api/onboarding/{$type}", ['guarantor_name' => 'First Person', 'guarantor_phone' => '08033334444', 'guarantor_relationship' => 'Relative', 'guarantor_2_name' => 'Second Person', 'guarantor_2_phone' => '08033334444', 'guarantor_2_relationship' => 'Former employer'])
                ->assertUnprocessable()->assertJsonValidationErrors(['guarantor_2_phone']);
        }
    }

    public function test_older_submission_is_readable_but_needs_second_guarantor_before_approval(): void
    {
        $user = $this->makeEmployer();
        $user->forceFill(['approval_status' => 'pending', 'onboarding_submitted_at' => now()])->save();
        DB::table('registration_verification_details')->insert([
            'user_id' => $user->id, 'nin_hash' => hash('sha256', '12345678902'), 'nin_encrypted' => Crypt::encryptString('12345678902'), 'nin_last4' => '8902',
            'guarantor_name_encrypted' => Crypt::encryptString('First Person'), 'guarantor_phone_encrypted' => Crypt::encryptString('08033334444'), 'guarantor_relationship_encrypted' => Crypt::encryptString('Relative'), 'address_proof_path' => 'legacy.pdf', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->makeAdmin(), 'sanctum')->getJson("/api/admin/users/{$user->uuid}/registration-details")
            ->assertOk()->assertJsonPath('data.guarantor_name', 'First Person')->assertJsonPath('data.guarantor_2_name', null);
        $this->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertUnprocessable();
        $this->assertSame('pending', $user->fresh()->approval_status);
        $this->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'rejected', 'notes' => 'Please provide two guarantors.'])->assertOk();
    }
}
