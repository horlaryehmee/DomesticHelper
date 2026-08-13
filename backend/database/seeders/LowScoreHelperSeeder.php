<?php

namespace Database\Seeders;

use App\Enums\EmploymentRecordStatus;
use App\Enums\IdentityVerificationStatus;
use App\Enums\IdentityVerificationType;
use App\Enums\RecordVerificationStatus;
use App\Enums\ReportOutcome;
use App\Enums\ReviewStatus;
use App\Models\Dispute;
use App\Models\EmploymentRecord;
use App\Models\IdentityVerification;
use App\Models\Review;
use App\Models\Skill;
use App\Models\TrustScoreEvent;
use App\Models\User;
use App\Services\ReportService;
use App\Services\TrustScoreService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

/**
 * Demo helpers with LOW trust scores, built through the real integrity chain:
 * verified employment / reviews (positive events) and admin-verified reports
 * (negative events). Every score is derived from audited events — never
 * hard-coded. Scores land on: 15, 35, 40, 45 (+ Hannah at 30 from the
 * report seeder) so the search page's trust filter has a full spread.
 */
class LowScoreHelperSeeder extends Seeder
{
    public function run(ReportService $reports, TrustScoreService $trustScore): void
    {
        $employers = UserSeeder::$employerUsers;
        $admin = User::where('email', 'admin@domestichelper.test')->first();
        $verifier = User::where('email', 'verifier@domestichelper.test')->first();
        $skills = Skill::where('category', 'helper')->get()->keyBy('name');

        // [first, last, gender, city, state, skills, years, salary, verification_status]
        $lowScoreHelpers = [
            ['Amina', 'Yusuf', 'female', 'Ikeja', 'Lagos', ['Housekeeping', 'Laundry'], 2, 55000, 'verified'],
            ['Daniel', 'Obi', 'male', 'Garki', 'FCT Abuja', ['Security', 'Driving'], 3, 80000, 'flagged'],
            ['Blessing', 'Eze', 'female', 'Lekki', 'Lagos', ['Cleaning'], 4, 60000, 'under_review'],
            ['Musa', 'Abubakar', 'male', 'Port Harcourt', 'Rivers', ['Driving'], 5, 90000, 'flagged'],
        ];

        foreach ($lowScoreHelpers as $i => [$first, $last, $gender, $city, $state, $helperSkills, $years, $salary, $status]) {
            $email = 'helper'.(31 + $i).'@domestichelper.test';

            $user = User::create([
                'first_name' => $first, 'last_name' => $last,
                'email' => $email,
                'phone' => '0812'.sprintf('%07d', 3000000 + $i),
                'password' => 'password',
                'user_type' => 'helper',
                'phone_verified_at' => now(), 'email_verified_at' => now(),
                'last_active_at' => now()->subDays(random_int(0, 14)),
            ]);

            $nin = sprintf('99345%06d', 100000 + $i);

            $user->helperProfile()->create([
                'date_of_birth' => now()->subYears(random_int(24, 45))->subMonths(random_int(0, 11)),
                'gender' => $gender,
                'state' => $state, 'city' => $city,
                'nin_encrypted' => Crypt::encryptString($nin),
                'nin_hash' => hash('sha256', $nin),
                'nin_last4' => substr($nin, -4),
                'photo_path' => $this->makeAvatar($user, $first, $last),
                'bio' => $this->bio($first, $helperSkills, $years),
                'years_experience' => $years,
                'availability' => 'within_2_weeks',
                'employment_type' => 'full_time',
                'expected_salary_min' => $salary - 10000,
                'expected_salary_max' => $salary + 15000,
                'is_public' => true,
                'verification_status' => $status,
                'profile_completed' => true,
            ]);

            $user->helperProfile->skills()->attach(
                collect($helperSkills)->map(fn ($s) => $skills[$s]->id ?? null)->filter(),
            );

            // Identity verified for all four (who they are is not in question).
            foreach (['photo', 'nin'] as $type) {
                IdentityVerification::create([
                    'user_id' => $user->id,
                    'type' => IdentityVerificationType::from($type),
                    'status' => IdentityVerificationStatus::Approved,
                    'verified_at' => now()->subDays(random_int(20, 250)),
                    'reviewed_by' => $verifier?->id,
                    'reviewed_at' => now()->subDays(random_int(20, 250)),
                ]);
            }

            $employer = $employers[$i % count($employers)];

            switch ($first) {
                case 'Amina':
                    // 50 - 15 = 35. One verified complaint, no positive history.
                    $this->verifiedReport($reports, $employer, $admin, $user, 'theft',
                        'Some household items were noticed missing after the employment period. I am reporting this for documentation and review.',
                        'I did not take anything. I have requested a review of this claim.');
                    break;

                case 'Daniel':
                    // 50 - 15 - 20 = 15. Verified complaint + verified job abandonment.
                    $theft = $this->verifiedReport($reports, $employer, $admin, $user, 'theft',
                        'Items were noticed missing after the engagement ended. Reported for review.',
                        'This claim is not accurate and I have asked for it to be reviewed.');
                    $abandonment = $this->verifiedReport($reports, $employer, $admin, $user, 'job_abandonment',
                        'The helper left the role without notice and did not return calls afterwards.',
                        'I left because my salary was unpaid for two months. I am disputing this.');

                    // Open dispute against the abandonment event (pending admin review).
                    $event = TrustScoreEvent::where('event_type', 'job_abandonment')
                        ->where('helper_id', $user->id)->first();
                    if ($event) {
                        Dispute::create([
                            'helper_id' => $user->id,
                            'disputable_type' => $event->getMorphClass(),
                            'disputable_id' => $event->id,
                            'reason' => 'Unpaid salary before leaving',
                            'explanation' => 'My salary was unpaid for two months before I left. I raised this with the employer first and can provide bank statements showing the missing payments.',
                            'status' => \App\Enums\DisputeStatus::Submitted,
                        ]);
                    }
                    break;

                case 'Blessing':
                    // 50 + 20 + 10 - 20 - 15 = 45. Good history, recent verified incidents,
                    // plus one OPEN report still under review.
                    $record = $this->employment($user, $employer, 'Cleaner');
                    $trustScore->recordEvent($user, 'job_completed', null, $record, 'Verified job completion');
                    $this->approvedReview($user, $employer, $record, 4, 'Did a good job overall. Punctual and thorough.');
                    $trustScore->recordEvent($user, 'positive_review', null, $record, 'Verified positive review');
                    $this->verifiedReport($reports, $employer, $admin, $user, 'job_abandonment',
                        'The helper stopped coming to work without notice.', 'I had a family emergency and informed them, but the message was not received.');
                    $this->verifiedReport($reports, $employer, $admin, $user, 'poor_performance',
                        'The standard of work was below what was agreed in recent weeks.',
                        'I did my best during a difficult period and have asked for this to be reviewed.');
                    // Open report: no admin decision yet — does NOT affect the score.
                    $reports->submit($employer, $user, [
                        'employment_record_id' => $record->id,
                        'category' => 'other',
                        'description' => 'A recent concern is being reviewed by the team.',
                    ]);
                    break;

                case 'Musa':
                    // 50 + 20 + 10 + 5 - 45 = 40. Strong history, three verified complaints.
                    $record = $this->employment($user, $employer, 'Driver');
                    $trustScore->recordEvent($user, 'job_completed', null, $record, 'Verified job completion');
                    $record2 = $this->employment($user, $employer, 'Driver', 30);
                    $trustScore->recordEvent($user, 'additional_employment', null, $record2, 'Additional verified employment');
                    $this->approvedReview($user, $employer, $record, 5, 'Reliable driver, always on time.');
                    $trustScore->recordEvent($user, 'positive_review', null, $record, 'Verified positive review');
                    $this->verifiedReport($reports, $employer, $admin, $user, 'misconduct',
                        'There were repeated incidents of unprofessional conduct during the engagement.',
                        'I dispute parts of this and provided my side of the story.');
                    $this->verifiedReport($reports, $employer, $admin, $user, 'property_damage',
                        'A vehicle was damaged during use and this was reported for review.',
                        'The damage was a minor accident which I reported immediately and offered to contribute to repairs.');
                    $this->verifiedReport($reports, $employer, $admin, $user, 'poor_performance',
                        'Punctuality declined in the final weeks of the engagement.',
                        'I had transport difficulties at that time and communicated this.');
                    break;
            }

            // Recalculate so the score row reflects the events (audited).
            $trustScore->recalculate($user);
        }

        $this->command?->info('Created 4 low-trust-score demo helpers (scores 15, 35, 40, 45).');
    }

    private function verifiedReport(ReportService $reports, User $employer, ?User $admin, User $helper, string $category, string $description, string $helperResponse)
    {
        $report = $reports->submit($employer, $helper, [
            'employment_record_id' => null,
            'category' => $category,
            'description' => $description,
        ]);
        $reports->helperRespond($report, $helper, $helperResponse);
        $reports->decide($report, ReportOutcome::Verified, $admin, 'Evidence reviewed by the verification team. Outcome recorded.');

        return $report;
    }

    private function employment(User $helper, User $employer, string $role, int $monthsAgo = 14): EmploymentRecord
    {
        return EmploymentRecord::create([
            'employer_id' => $employer->id,
            'helper_id' => $helper->id,
            'job_role' => $role,
            'start_date' => now()->subMonths($monthsAgo + 10),
            'end_date' => now()->subMonths($monthsAgo),
            'salary' => null,
            'status' => EmploymentRecordStatus::Completed,
            'verification_status' => RecordVerificationStatus::Verified,
        ]);
    }

    private function approvedReview(User $helper, User $employer, EmploymentRecord $record, int $rating, string $feedback): Review
    {
        return Review::create([
            'helper_id' => $helper->id,
            'employer_id' => $employer->id,
            'employment_record_id' => $record->id,
            'rating' => $rating,
            'feedback' => $feedback,
            'status' => ReviewStatus::Approved,
        ]);
    }

    private function bio(string $first, array $skills, int $years): string
    {
        $list = strtolower(implode(', ', array_slice($skills, 0, 3)));

        return "Hi, I'm {$first}. I have {$years} years of experience in {$list}. I am hardworking and treat every home with respect. I am available to start work and can provide references on request.";
    }

    private function makeAvatar(User $user, string $first, string $last): string
    {
        $colors = ['0F766E', '1D4ED8', 'B45309', '9D174D', '4D7C0F', '7C2D12', '4338CA', '0E7490'];
        $color = $colors[crc32($user->email) % count($colors)];
        $initials = strtoupper($first[0].$last[0]);

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <rect width="240" height="240" fill="#{$color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">{$initials}</text>
</svg>
SVG;

        $path = 'profiles/'.str($user->email)->before('@').'.svg';
        Storage::disk('public')->put($path, $svg);

        return $path;
    }
}
