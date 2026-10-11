<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Tests\MakesUsers;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_employer_can_register(): void
    {
        Storage::fake('private');
        $response = $this->post('/api/auth/register/employer', [
            'first_name' => 'Test',
            'last_name' => 'Employer',
            'email' => 'boss@example.com',
            'phone' => '08030000001',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'profile_type' => 'individual',
            'city' => 'Lekki',
            'state' => 'Lagos',
            'address_line' => '12 Example Street',
            'nin' => '12345678902',
            'guarantor_name' => 'Ada Guarantor',
            'guarantor_phone' => '08030000002',
            'guarantor_relationship' => 'Sibling',
            'address_proof' => UploadedFile::fake()->create('utility-bill.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()->assertJsonStructure(['token', 'user']);
        $this->assertDatabaseHas('users', ['email' => 'boss@example.com', 'user_type' => 'employer']);
        $this->assertDatabaseHas('employer_profiles', ['user_id' => User::where('email', 'boss@example.com')->first()->id]);
        $details = \Illuminate\Support\Facades\DB::table('registration_verification_details')->where('user_id', User::where('email', 'boss@example.com')->first()->id)->first();
        $this->assertEquals('12345678902', Crypt::decryptString($details->nin_encrypted));
        $this->assertEquals('Ada Guarantor', Crypt::decryptString($details->guarantor_name_encrypted));
        Storage::disk('private')->assertExists($details->address_proof_path);
        $registered = User::where('email', 'boss@example.com')->first();
        $this->actingAs($registered, 'sanctum')
            ->getJson("/api/admin/users/{$registered->uuid}/registration-details")
            ->assertForbidden();
        $this->actingAs($this->makeAdmin(), 'sanctum')
            ->getJson("/api/admin/users/{$registered->uuid}/registration-details")
            ->assertOk()
            ->assertJsonPath('data.nin_last4', '8902')
            ->assertJsonMissing(['nin_encrypted' => $details->nin_encrypted]);
        $this->get("/api/admin/users/{$registered->uuid}/address-proof")->assertOk();
    }

    public function test_helper_can_register_and_nin_is_encrypted_at_rest(): void
    {
        Storage::fake('private');
        $skill = $this->seedSkill('Nanny');

        $response = $this->post('/api/auth/register/helper', [
            'first_name' => 'Test',
            'last_name' => 'Helper',
            'email' => 'helper@example.com',
            'phone' => '08120000001',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'date_of_birth' => '1995-01-01',
            'gender' => 'female',
            'state' => 'Lagos',
            'city' => 'Yaba',
            'nin' => '12345678901',
            'skills' => [$skill->id],
            'years_experience' => 3,
            'availability' => 'immediate',
            'expected_salary_min' => 60000,
            'address_line' => '4 Example Road',
            'guarantor_name' => 'Tunde Guarantor',
            'guarantor_phone' => '08120000002',
            'guarantor_relationship' => 'Former employer',
            'address_proof' => UploadedFile::fake()->create('utility-bill.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated();

        $user = User::where('email', 'helper@example.com')->first();
        $profile = $user->helperProfile;

        // NIN encrypted at rest — raw NIN must not appear in the DB column
        $this->assertNotEquals('12345678901', $profile->nin_encrypted);
        $this->assertEquals('12345678901', Crypt::decryptString($profile->nin_encrypted));
        $this->assertEquals(hash('sha256', '12345678901'), $profile->nin_hash);
        $details = \Illuminate\Support\Facades\DB::table('registration_verification_details')->where('user_id', $user->id)->first();
        $this->assertEquals('Tunde Guarantor', Crypt::decryptString($details->guarantor_name_encrypted));
        Storage::disk('private')->assertExists($details->address_proof_path);
    }

    public function test_employer_cannot_register_without_identity_guarantor_and_address_proof(): void
    {
        $this->postJson('/api/auth/register/employer', [
            'first_name' => 'Test',
            'last_name' => 'Employer',
            'email' => 'missing@example.com',
            'phone' => '08030000009',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'profile_type' => 'individual',
            'city' => 'Lekki',
            'state' => 'Lagos',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'nin', 'address_line', 'guarantor_name', 'guarantor_phone',
            'guarantor_relationship', 'address_proof',
        ]);
    }

    public function test_duplicate_nin_is_rejected(): void
    {
        $this->makeHelper(['nin' => '11111111111']);

        $response = $this->postJson('/api/auth/register/helper', [
            'first_name' => 'Another',
            'last_name' => 'Helper',
            'email' => 'another@example.com',
            'phone' => '08120000002',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'state' => 'Lagos',
            'city' => 'Ikeja',
            'nin' => '11111111111',
            'skills' => [$this->seedSkill('Cleaning')->id],
            'years_experience' => 1,
            'availability' => 'immediate',
            'expected_salary_min' => 50000,
        ]);

        $response->assertStatus(422);
    }

    public function test_login_with_email_and_phone(): void
    {
        $user = $this->makeEmployer(['password' => 'password123']);

        $this->postJson('/api/auth/login', ['login' => $user->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['token']);

        $this->postJson('/api/auth/login', ['login' => $user->phone, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = $this->makeEmployer();

        $this->postJson('/api/auth/login', ['login' => $user->email, 'password' => 'wrong-password'])
            ->assertStatus(422);
    }

    public function test_suspended_user_cannot_login(): void
    {
        $user = $this->makeEmployer(['status' => UserStatus::Suspended]);

        $this->postJson('/api/auth/login', ['login' => $user->email, 'password' => 'password'])
            ->assertStatus(403);
    }

    public function test_authenticated_user_can_fetch_their_profile(): void
    {
        $user = $this->makeEmployer();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
    }
}
