<?php

namespace Tests\Feature;

use App\Models\Job;
use App\Models\Setting;
use App\Models\User;
use App\Services\PlatformFeatures;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\MakesUsers;
use Tests\TestCase;

class PlatformFeaturesTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['features.default_enabled' => false]);
    }

    private function switches(): array
    {
        return array_fill_keys(array_keys(config('features.modules')), false) + [];
    }

    private function enable(array $keys): array
    {
        $values = $this->switches();
        foreach ($keys as $key) {
            $values[$key] = true;
        }app(PlatformFeatures::class)->save($values);

        return $values;
    }

    public function test_default_is_verification_only_and_disabled_public_endpoints_are_unavailable(): void
    {
        $this->assertFalse((require base_path('config/features.php'))['default_enabled']);
        $response = $this->getJson('/api/features')->assertOk();
        $this->assertNotEmpty($response->json('enabled'));
        $this->assertNotContains(true, $response->json('enabled'));
        foreach (['/api/helpers', '/api/jobs', '/api/community-experiences', '/api/demo/accounts'] as $path) {
            $this->getJson($path)->assertNotFound();
        }
        $this->getJson('/api/meta')->assertOk()->assertJsonPath('skills', [])->assertJsonPath('job_categories', []);
    }

    public function test_disabled_admin_modules_and_creation_endpoints_are_blocked_even_for_master_admin(): void
    {
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum');
        foreach (['/api/admin/jobs', '/api/admin/community-experiences', '/api/admin/reviews', '/api/admin/reports', '/api/admin/payments', '/api/admin/trust-score/rules'] as $path) {
            $this->getJson($path)->assertNotFound();
        }
        $this->postJson('/api/admin/jobs', [])->assertNotFound();
        $this->postJson('/api/admin/community-experiences/example/media', [])->assertNotFound();
        $this->getJson('/api/admin/users')->assertOk();
        $this->getJson('/api/admin/verifications')->assertOk();
        $this->getJson('/api/admin/settings/features')->assertOk();
    }

    public function test_only_master_admin_can_publish_switches_and_dependencies_are_validated(): void
    {
        $this->actingAs($this->makeAdmin(), 'sanctum')->putJson('/api/admin/settings/features', ['features' => $this->switches()])->assertForbidden();
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum');
        $invalid = $this->switches();
        $invalid['job_posting'] = true;
        $this->putJson('/api/admin/settings/features', ['features' => $invalid])->assertUnprocessable();
        $values = $this->switches();
        $values['job_directory'] = true;
        $this->putJson('/api/admin/settings/features', ['features' => $values])->assertOk();
        $this->getJson('/api/jobs')->assertOk();
        $this->postJson('/api/admin/jobs', [])->assertNotFound();
        $this->getJson('/api/helpers')->assertNotFound();
        $this->putJson('/api/admin/settings', ['settings' => [['key' => 'platform_feature_switches', 'value' => '{}']]])->assertUnprocessable();
    }

    public function test_disabled_module_data_is_preserved_and_restored_when_enabled(): void
    {
        $employer = $this->makeEmployer();
        $job = Job::create(['employer_id' => $employer->id, 'title' => 'Existing role', 'work_type' => 'Nanny', 'description' => 'A long existing description of the role for a household.', 'state' => 'Lagos', 'city' => 'Lekki', 'employment_type' => 'full_time', 'salary_type' => 'monthly', 'status' => 'active']);
        $this->getJson('/api/jobs')->assertNotFound();
        $this->assertDatabaseHas('jobs', ['id' => $job->id]);
        $this->enable(['job_directory']);
        $this->getJson('/api/jobs')->assertOk()->assertJsonPath('data.0.uuid', $job->uuid);
        $this->enable([]);
        $this->getJson('/api/jobs')->assertNotFound();
        $this->assertDatabaseHas('jobs', ['id' => $job->id]);
    }

    public function test_core_helper_onboarding_works_without_collecting_disabled_listing_fields(): void
    {
        Storage::fake('private');
        $user = User::factory()->create(['user_type' => 'helper', 'approval_status' => 'draft', 'email_verified_at' => now(), 'details_confirmed_at' => now()]);
        $payload = ['date_of_birth' => '1990-01-01', 'gender' => 'female', 'state' => 'Lagos', 'city' => 'Lekki', 'nin' => '98765432101', 'address_line' => '12 Example Street', 'guarantor_name' => 'First Person', 'guarantor_phone' => '08031112222', 'guarantor_relationship' => 'Relative', 'guarantor_2_name' => 'Second Person', 'guarantor_2_phone' => '08034445555', 'guarantor_2_relationship' => 'Former employer', 'address_proof' => UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')];
        $this->actingAs($user, 'sanctum')->post('/api/onboarding/helper', $payload, ['Accept' => 'application/json'])->assertCreated();
        $this->assertFalse($user->helperProfile()->firstOrFail()->is_public);
        $this->assertFalse($user->helperProfile()->firstOrFail()->skills()->exists());
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum')->postJson("/api/admin/account-verifications/{$user->uuid}/decide", ['status' => 'approved'])->assertOk();
        $this->assertFalse($user->helperProfile()->firstOrFail()->is_public);
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/me/verifications')->assertOk();
        $this->getJson('/api/helpers/me')->assertNotFound();
    }

    public function test_admin_can_add_jobs_only_when_directory_and_posting_are_enabled(): void
    {
        $employer = $this->makeEmployer();
        $this->enable(['job_directory', 'job_posting']);
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum')->postJson('/api/admin/jobs', ['employer_uuid' => $employer->uuid, 'title' => 'Nanny needed', 'work_type' => 'Nanny', 'description' => 'We need an experienced nanny for a household in Lekki.', 'state' => 'Lagos', 'city' => 'Lekki', 'salary_type' => 'monthly', 'employment_type' => 'full_time', 'status' => 'active'])->assertCreated()->assertJsonPath('data.title', 'Nanny needed');
        $this->getJson('/api/jobs')->assertOk()->assertJsonPath('data.0.title', 'Nanny needed');
        $this->enable(['job_directory']);
        $this->postJson('/api/admin/jobs', [])->assertNotFound();
    }

    public function test_dashboard_contains_only_core_overview_and_settings_hide_disabled_areas(): void
    {
        Setting::setValue('trust_score_base', '50', 'trust');
        Setting::setValue('verification_report_price', '5000', 'payments');
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum')->getJson('/api/dashboard')->assertOk()->assertJsonMissingPath('data.active_jobs')->assertJsonMissingPath('data.revenue')->assertJsonPath('data.total_users', 1);
        $this->getJson('/api/admin/settings')->assertOk()->assertJsonMissing(['key' => 'trust_score_base'])->assertJsonMissing(['key' => 'verification_report_price']);
        $this->putJson('/api/admin/settings', ['settings' => [['key' => 'verification_report_price', 'value' => '6000', 'group' => 'general']]])->assertNotFound();
    }

    public function test_verification_resubmission_preserves_inactive_listing_details(): void
    {
        Storage::fake('private');
        $user = $this->makeHelper([], ['bio' => 'Existing work biography', 'years_experience' => 7, 'expected_salary_min' => 90000]);
        $user->forceFill(['approval_status' => 'rejected', 'details_confirmed_at' => now()])->save();
        $payload = ['date_of_birth' => '1990-01-01', 'gender' => 'female', 'state' => 'Lagos', 'city' => 'Lekki', 'nin' => '98765432102', 'address_line' => '12 Example Street', 'guarantor_name' => 'First Person', 'guarantor_phone' => '08031112222', 'guarantor_relationship' => 'Relative', 'guarantor_2_name' => 'Second Person', 'guarantor_2_phone' => '08034445555', 'guarantor_2_relationship' => 'Former employer', 'address_proof' => UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')];
        $this->actingAs($user, 'sanctum')->post('/api/onboarding/helper', $payload, ['Accept' => 'application/json'])->assertCreated();
        $profile = $user->helperProfile()->firstOrFail();
        $this->assertSame('Existing work biography', $profile->bio);
        $this->assertEquals(7, $profile->years_experience);
        $this->assertEquals(90000, $profile->expected_salary_min);
    }
}
