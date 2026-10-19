<?php

namespace App\Services;

use App\Models\Job;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DemoDataService
{
    public function loginAccounts(): array
    {
        $markedIds = DB::table('demo_users')->pluck('user_id');

        return User::query()
            ->whereIn('id', $this->demoIds())
            ->whereIn('user_type', ['employer', 'helper'])
            ->orderBy('email')
            ->get(['id', 'email', 'first_name', 'last_name', 'user_type', 'password'])
            ->map(fn ($user) => [
                'email' => $user->email,
                'label' => trim($user->first_name.' '.$user->last_name),
                'type' => $user->user_type->value,
                'password' => $markedIds->contains($user->id) ? 'DemoOnly!2026' : 'password',
                'valid' => Hash::check($markedIds->contains($user->id) ? 'DemoOnly!2026' : 'password', $user->password),
            ])
            ->filter(fn ($account) => $account['valid'])
            ->map(fn ($account) => collect($account)->except('valid')->all())
            ->values()->all();
    }

    public function status(): array
    {
        $ids = $this->demoIds();

        return [
            'users' => $ids->count(),
            'helpers' => User::whereIn('id', $ids)->where('user_type', 'helper')->count(),
            'employers' => User::whereIn('id', $ids)->where('user_type', 'employer')->count(),
            'jobs' => Job::whereIn('employer_id', $ids)->count(),
        ];
    }

    public function fill(): array
    {
        if ($this->demoIds()->isNotEmpty()) {
            return $this->status();
        }

        DB::transaction(function () {
            $employer = User::create([
                'first_name' => 'Demo', 'last_name' => 'Employer',
                'email' => 'employer@demo.hiresafe.invalid',
                'phone' => '08030009991',
                'password' => 'DemoOnly!2026',
                'user_type' => 'employer',
            ]);
            $employer->employerProfile()->create([
                'profile_type' => 'individual', 'city' => 'Lekki', 'state' => 'Lagos',
                'bio' => 'Example household for exploring Hire Safe.',
            ]);
            $this->mark($employer);

            $skill = Skill::where('category', 'helper')->first();
            foreach ([
                ['Ada', 'Sample', 'Ikeja', 'Housekeeping'],
                ['Tunde', 'Sample', 'Lekki', 'Driving'],
                ['Grace', 'Sample', 'Yaba', 'Child care'],
            ] as $index => [$first, $last, $city, $work]) {
                $helper = User::create([
                    'first_name' => $first, 'last_name' => $last,
                    'email' => 'helper'.($index + 1).'@demo.hiresafe.invalid',
                    'phone' => '0803000999'.($index + 2),
                    'password' => 'DemoOnly!2026',
                    'user_type' => 'helper',
                ]);
                $profile = $helper->helperProfile()->create([
                    'date_of_birth' => '1995-01-01',
                    'gender' => $index === 1 ? 'male' : 'female',
                    'state' => 'Lagos', 'city' => $city,
                    'address_line' => 'Demo address',
                    'nin_encrypted' => Crypt::encryptString('9000000000'.$index),
                    'nin_hash' => hash('sha256', '9000000000'.$index),
                    'nin_last4' => '000'.$index,
                    'years_experience' => $index + 2,
                    'availability' => 'immediate',
                    'employment_type' => 'any',
                    'expected_salary_min' => 60000 + $index * 15000,
                    'bio' => "Demo profile: experienced in {$work}.",
                    'is_public' => true,
                ]);
                if ($skill) $profile->skills()->attach($skill->id);
                $this->mark($helper);
            }

            Job::create([
                'employer_id' => $employer->id,
                'title' => 'Demo: Housekeeper needed in Lekki',
                'work_type' => 'Housekeeper',
                'description' => 'Example job listing for exploring Hire Safe.',
                'salary_min' => 70000,
                'salary_type' => 'monthly',
                'location' => 'Lekki', 'state' => 'Lagos', 'city' => 'Lekki',
                'employment_type' => 'full_time',
                'status' => 'active',
                'expires_at' => now()->addMonths(6),
            ]);
        });

        return $this->status();
    }

    public function clear(?int $actingUserId = null): array
    {
        $mediaPaths = DB::transaction(function () use ($actingUserId) {
            $ids = $this->demoIds();
            if ($actingUserId && $ids->contains($actingUserId)) {
                throw ValidationException::withMessages(['demo' => 'You cannot clear the account you are signed in with. Sign in as the live master admin first.']);
            }
            $demoJobIds = Job::whereIn('employer_id', $ids)->pluck('id');
            if (
                DB::table('job_applications')->whereIn('job_id', $demoJobIds)->whereNotIn('helper_id', $ids)->exists()
                || DB::table('saved_jobs')->whereIn('job_id', $demoJobIds)->whereNotIn('helper_id', $ids)->exists()
                || DB::table('employment_records')->whereIn('employer_id', $ids)->whereNotIn('helper_id', $ids)->exists()
                || DB::table('employment_records')->whereIn('helper_id', $ids)->whereNotIn('employer_id', $ids)->exists()
                || DB::table('interviews')->whereIn('employer_id', $ids)->whereNotIn('helper_id', $ids)->exists()
                || DB::table('interviews')->whereIn('helper_id', $ids)->whereNotIn('employer_id', $ids)->exists()
                || DB::table('conversations')->whereIn('employer_id', $ids)->whereNotIn('helper_id', $ids)->exists()
                || DB::table('conversations')->whereIn('helper_id', $ids)->whereNotIn('employer_id', $ids)->exists()
                || DB::table('saved_helpers')->whereIn('helper_id', $ids)->whereNotIn('employer_id', $ids)->exists()
                || DB::table('reviews')->whereIn('helper_id', $ids)->whereNotIn('employer_id', $ids)->exists()
                || DB::table('reports')->whereIn('helper_id', $ids)->whereNotIn('reporter_id', $ids)->exists()
                || DB::table('verification_reports')->whereIn('helper_id', $ids)->whereNotIn('purchased_by', $ids)->exists()
            ) {
                throw ValidationException::withMessages(['demo' => 'Real users have interacted with demo accounts. Review those records before clearing demo data.']);
            }

            $users = User::withTrashed()->whereIn('id', $ids)->with('helperProfile')->get();
            $paths = [];

            foreach ($users as $user) {
                if ($user->helperProfile?->photo_path) $paths[] = $user->helperProfile->photo_path;
                if ($user->helperProfile?->intro_video_path) $paths[] = $user->helperProfile->intro_video_path;
                $user->forceDelete();
            }

            return $paths;
        });

        if ($mediaPaths) Storage::disk('public')->delete($mediaPaths);

        return $this->status();
    }

    private function mark(User $user): void
    {
        DB::table('demo_users')->insert(['user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function demoIds(): \Illuminate\Support\Collection
    {
        $marked = DB::table('demo_users')->pluck('user_id');
        $legacy = User::withTrashed()->where('email', 'like', '%@domestichelper.test')
            ->get(['id', 'email'])
            ->filter(fn ($user) => preg_match('/^(helper\d+|employer\d+|admin|verifier|moderator)@domestichelper\.test$/', $user->email))
            ->pluck('id');

        return $marked->concat($legacy)->unique()->values();
    }
}
