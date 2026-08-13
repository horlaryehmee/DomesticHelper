<?php

namespace Database\Seeders;

use App\Enums\EmploymentRecordStatus;
use App\Enums\RecordVerificationStatus;
use App\Enums\ReviewStatus;
use App\Models\EmploymentRecord;
use App\Models\EmploymentVerification;
use App\Models\Review;
use App\Models\TrustScoreEvent;
use App\Models\User;
use App\Services\EmploymentService;
use App\Services\ReviewService;
use App\Services\TrustScoreService;
use Illuminate\Database\Seeder;

class EmploymentAndReviewSeeder extends Seeder
{
    private array $roles = ['Housekeeper', 'Nanny', 'Cook', 'Driver', 'Cleaner', 'Caregiver'];

    public function run(EmploymentService $employment, ReviewService $reviews, TrustScoreService $trustScore): void
    {
        $employers = UserSeeder::$employerUsers;
        $helpers = UserSeeder::$helperUsers;
        $admin = User::where('email', 'admin@domestichelper.test')->first();

        $feedbacks = [
            'Extremely reliable and trustworthy. Worked with our family for over a year without any issues. Highly recommended.',
            'Very professional, always punctual and keeps the house spotless. Would definitely hire again.',
            'Wonderful with our children. Patient, caring and dependable. We were sad to see her go.',
            'Excellent cook and kept the kitchen very organized. A pleasure to have in the home.',
            'Dependable driver, always on time and very careful on the road.',
            'Hardworking and honest. Treated our home with complete respect.',
            'Good worker overall, though occasionally needed supervision on detailed cleaning tasks.',
            'Caring and attentive to our elderly mother. Very compassionate person.',
            'Reliable and well-mannered. Communication could improve but no complaints about the work.',
        ];

        // Build verified employment histories for the first 16 helpers (15 verified + 1)
        $recordCounter = 0;
        foreach ($helpers as $index => $helper) {
            if ($index >= 16) {
                break;
            }

            $employer = $employers[$index % count($employers)];
            $role = $this->roles[$index % count($this->roles)];
            $count = ($index % 3) + 1; // 1-3 past jobs each
            $isVerifiedHelper = $index < 15;

            for ($j = 0; $j < $count; $j++) {
                $recordCounter++;
                $start = now()->subMonths(($count - $j) * 8 + 6)->startOfMonth();
                $end = $start->copy()->addMonths(5 + ($j % 6)); // 5-10 months

                $record = EmploymentRecord::create([
                    'employer_id' => $employer->id,
                    'helper_id' => $helper->id,
                    'job_role' => $role,
                    'start_date' => $start->toDateString(),
                    'end_date' => $end->toDateString(),
                    'salary' => (int) (($helper->helperProfile->expected_salary_min ?? 60000) + random_int(0, 15000)),
                    'employment_type' => 'full_time',
                    'location' => $employer->employerProfile->city,
                    'status' => EmploymentRecordStatus::Completed,
                    'verification_status' => $isVerifiedHelper ? RecordVerificationStatus::Verified : RecordVerificationStatus::Unverified,
                    'verified_at' => $isVerifiedHelper ? $end : null,
                    'termination_reason' => ['Contract completed', 'Family relocated', 'Role fulfilled'][$j % 3],
                    'performance_rating' => random_int(3, 5),
                ]);

                if ($isVerifiedHelper) {
                    EmploymentVerification::create([
                        'employment_record_id' => $record->id,
                        'status' => 'confirmed',
                        'confirmed_job_role' => $role,
                        'confirmed_start_date' => $start->toDateString(),
                        'confirmed_end_date' => $end->toDateString(),
                        'confirmed_performance' => $record->performance_rating,
                        'requested_at' => $end,
                        'responded_at' => $end->addDays(3),
                    ]);

                    // Trust events awarded through the service — audited & consistent.
                    if ($j === 0) {
                        $trustScore->recordEvent($helper, 'job_completed', null, $record, 'Verified job completion');
                        if ($end->diffInMonths($start) >= 12) {
                            $trustScore->recordEvent($helper, 'long_term_employment', null, $record, 'Long-term employment');
                        }
                    } else {
                        $trustScore->recordEvent($helper, 'additional_employment', null, $record, 'Additional verified employment');
                    }
                }

                // Review per completed record (only for verified records → approved)
                $review = $reviews->create($employer, $helper, $record, [
                    'rating' => $record->performance_rating,
                    'work_type' => $role,
                    'duration_worked' => $end->diffInMonths($start).' months',
                    'feedback' => $feedbacks[($recordCounter + $j) % count($feedbacks)],
                ]);

                if ($isVerifiedHelper) {
                    $reviews->moderate($review, ReviewStatus::Approved, $admin);
                    if ($review->rating >= 4) {
                        $trustScore->recordEvent($helper, 'positive_review', null, $review, 'Verified positive review');
                    }
                } else {
                    $reviews->moderate($review, ReviewStatus::Pending, null);
                }
            }
        }

        // A few active (in-progress) employments
        foreach (array_slice($helpers, 0, 6) as $index => $helper) {
            $employer = $employers[($index + 3) % count($employers)];
            EmploymentRecord::create([
                'employer_id' => $employer->id,
                'helper_id' => $helper->id,
                'job_role' => $this->roles[($index + 2) % count($this->roles)],
                'start_date' => now()->subMonths(random_int(1, 4))->toDateString(),
                'salary' => (int) ($helper->helperProfile->expected_salary_min ?? 65000),
                'employment_type' => 'full_time',
                'location' => $employer->employerProfile->city,
                'status' => EmploymentRecordStatus::Active,
                'verification_status' => RecordVerificationStatus::Unverified,
            ]);
        }

        $this->command?->info('Created employment histories, verifications and reviews.');
    }
}
