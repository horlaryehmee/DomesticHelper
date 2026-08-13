<?php

namespace Tests;

use App\Models\Role;
use App\Models\Skill;
use App\Models\TrustScoreRule;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;

trait MakesUsers
{
    protected function makeEmployer(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'user_type' => 'employer',
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ], $attributes));

        $user->employerProfile()->create([
            'profile_type' => 'individual',
            'city' => 'Lekki',
            'state' => 'Lagos',
        ]);

        return $user;
    }

    protected function makeHelper(array $attributes = [], array $profile = []): User
    {
        static $ninCounter = 0;
        $ninCounter++;
        $nin = $attributes['nin'] ?? sprintf('12345678%03d', $ninCounter);

        $user = User::factory()->create(array_merge([
            'user_type' => 'helper',
            'phone_verified_at' => now(),
            'email_verified_at' => now(),
        ], collect($attributes)->except('nin')->toArray()));

        $user->helperProfile()->create(array_merge([
            'date_of_birth' => now()->subYears(30),
            'gender' => 'female',
            'state' => 'Lagos',
            'city' => 'Lekki',
            'nin_encrypted' => Crypt::encryptString($nin),
            'nin_hash' => hash('sha256', $nin),
            'nin_last4' => substr($nin, -4),
            'years_experience' => 5,
            'availability' => 'immediate',
            'employment_type' => 'full_time',
            'expected_salary_min' => 80000,
            'is_public' => true,
            'verification_status' => 'unverified',
            'profile_completed' => true,
        ], $profile));

        return $user;
    }

    protected function makeAdmin(string $role = 'admin'): User
    {
        $user = User::factory()->create(['user_type' => 'admin', 'email_verified_at' => now()]);
        $roleModel = Role::firstOrCreate(['slug' => $role, 'name' => $role]);

        // Mirror the seeder: staff roles carry the full permission set in tests.
        $permissions = \App\Models\Permission::query()->get();
        if ($permissions->isEmpty()) {
            $permissions = collect([
                'users.view', 'users.suspend', 'users.assign_roles',
                'verifications.review', 'employment.verify', 'reference_checks.manage',
                'reports.view', 'reports.decide', 'reviews.moderate',
                'disputes.view', 'disputes.decide', 'jobs.moderate',
                'payments.view', 'payments.refund', 'trust_scores.manage',
                'audit_logs.view', 'settings.manage',
            ])->map(fn ($slug) => \App\Models\Permission::create(['slug' => $slug, 'name' => $slug]));
        }
        $roleModel->permissions()->sync($permissions->pluck('id'));

        $user->roles()->attach($roleModel->id);

        return $user;
    }

    protected function makeSuperAdmin(): User
    {
        $user = User::factory()->create(['user_type' => 'admin', 'email_verified_at' => now()]);
        $user->roles()->attach(Role::firstOrCreate(['slug' => 'super-admin', 'name' => 'Super Admin'])->id);

        return $user;
    }

    protected function seedSkill(string $name): Skill
    {
        return Skill::create(['name' => $name, 'slug' => str($name)->slug(), 'category' => 'helper', 'active' => true]);
    }

    protected function seedRules(): void
    {
        foreach ([
            ['slug' => 'job-completed', 'event_type' => 'job_completed', 'points' => 20],
            ['slug' => 'positive-review', 'event_type' => 'positive_review', 'points' => 10],
            ['slug' => 'long-term-employment', 'event_type' => 'long_term_employment', 'points' => 10],
            ['slug' => 'additional-employment', 'event_type' => 'additional_employment', 'points' => 5],
            ['slug' => 'verified-complaint', 'event_type' => 'complaint_verified', 'points' => -15],
            ['slug' => 'job-abandonment', 'event_type' => 'job_abandonment', 'points' => -20],
        ] as $rule) {
            TrustScoreRule::firstOrCreate(['slug' => $rule['slug']], $rule + ['name' => $rule['slug'], 'active' => true]);
        }
    }

    /** Current trust score for a helper, creating the neutral row if absent. */
    protected function scoreOf(User $helper): int
    {
        $row = \App\Models\TrustScore::firstOrCreate(
            ['helper_id' => $helper->id],
            ['score' => 50, 'category' => 'moderate', 'events_count' => 0],
        );

        return $row->score;
    }
}
