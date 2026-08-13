<?php

namespace Tests\Feature;

use App\Models\EmploymentRecord;
use App\Models\TrustScore;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\MakesUsers;
use Tests\TestCase;

class HelperSearchTest extends TestCase
{
    use MakesUsers, RefreshDatabase;

    public function test_search_returns_public_helpers_only(): void
    {
        $public = $this->makeHelper(['first_name' => 'Grace'], ['is_public' => true]);
        $this->makeHelper(['first_name' => 'Hidden'], ['is_public' => false]);

        $response = $this->getJson('/api/helpers?per_page=20');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains(fn ($n) => str_contains($n, 'Grace')));
        $this->assertFalse($names->contains(fn ($n) => str_contains($n, 'Hidden')));
    }

    public function test_natural_language_search_finds_skill(): void
    {
        $skill = $this->seedSkill('Driving');
        $helper = $this->makeHelper();
        $helper->helperProfile->skills()->attach($skill);

        $response = $this->getJson('/api/helpers?q=driver&per_page=20');

        $response->assertOk();
        $this->assertTrue(collect($response->json('data'))->contains(fn ($h) => $h['uuid'] === $helper->uuid));
    }

    public function test_search_filters_by_state_and_trust(): void
    {
        $this->makeHelper(['first_name' => 'LagosHelper'], ['state' => 'Lagos']);
        $this->makeHelper(['first_name' => 'AbujaHelper'], ['state' => 'FCT Abuja']);

        $response = $this->getJson('/api/helpers?state=Lagos&per_page=20');

        $response->assertOk();
        foreach ($response->json('data') as $helper) {
            $this->assertEquals('Lagos', $helper['state']);
        }
    }

    public function test_search_never_exposes_private_fields(): void
    {
        $this->makeHelper();

        $response = $this->getJson('/api/helpers?per_page=20');

        $response->assertOk();
        foreach ($response->json('data') as $helper) {
            $this->assertArrayNotHasKey('nin', $helper);
            $this->assertArrayNotHasKey('nin_last4', $helper);
            $this->assertArrayNotHasKey('address_line', $helper);
            $this->assertArrayNotHasKey('phone', $helper);
            $this->assertArrayNotHasKey('email', $helper);
        }
    }

    public function test_public_profile_shows_only_approved_data(): void
    {
        $helper = $this->makeHelper();

        $response = $this->getJson("/api/helpers/{$helper->uuid}");

        $response->assertOk();
        $keys = array_keys($response->json('data'));
        foreach (['nin', 'address', 'phone', 'email'] as $forbidden) {
            $this->assertFalse(in_array($forbidden, $keys, true), "Public profile leaked [{$forbidden}]");
        }
    }

    public function test_public_employment_history_contains_only_verified_records(): void
    {
        $helper = $this->makeHelper();
        $employer = $this->makeEmployer();

        EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => 'Nanny',
            'start_date' => now()->subYear(),
            'end_date' => now()->subMonth(),
            'status' => 'completed',
            'verification_status' => 'verified',
        ]);
        EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => 'Cook',
            'start_date' => now()->subMonth(),
            'status' => 'active',
            'verification_status' => 'unverified',
        ]);

        $response = $this->getJson("/api/helpers/{$helper->uuid}/employment");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Nanny', $response->json('data.0.job_role'));
    }
}
