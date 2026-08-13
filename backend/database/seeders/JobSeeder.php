<?php

namespace Database\Seeders;

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Models\Interview;
use App\Models\Job;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Seeder;

class JobSeeder extends Seeder
{
    private array $jobs = [
        ['title' => 'Experienced Nanny for Two Children', 'work_type' => 'Nanny', 'city' => 'Lekki', 'state' => 'Lagos', 'min' => 80000, 'max' => 100000, 'live_in' => true],
        ['title' => 'Live-in Housekeeper Needed', 'work_type' => 'Housekeeper', 'city' => 'Victoria Island', 'state' => 'Lagos', 'min' => 70000, 'max' => 90000, 'live_in' => true],
        ['title' => 'Family Driver (Monday–Saturday)', 'work_type' => 'Driver', 'city' => 'Ikeja', 'state' => 'Lagos', 'min' => 75000, 'max' => 90000, 'live_in' => false],
        ['title' => 'Professional Cook for Busy Household', 'work_type' => 'Cook', 'city' => 'Ikoyi', 'state' => 'Lagos', 'min' => 100000, 'max' => 130000, 'live_in' => false],
        ['title' => 'Caregiver for Elderly Parent', 'work_type' => 'Caregiver', 'city' => 'Wuse', 'state' => 'FCT Abuja', 'min' => 90000, 'max' => 120000, 'live_in' => true],
        ['title' => 'Trustworthy Cleaner (Weekdays)', 'work_type' => 'Cleaner', 'city' => 'Ajah', 'state' => 'Lagos', 'min' => 50000, 'max' => 65000, 'live_in' => false],
        ['title' => 'Security Personnel for Residence', 'work_type' => 'Security Guard', 'city' => 'Port Harcourt', 'state' => 'Rivers', 'min' => 60000, 'max' => 75000, 'live_in' => true],
        ['title' => 'Gardener & Grounds Keeper', 'work_type' => 'Gardener', 'city' => 'Maitama', 'state' => 'FCT Abuja', 'min' => 55000, 'max' => 70000, 'live_in' => false],
        ['title' => 'Personal Assistant / Domestic Manager', 'work_type' => 'Personal Assistant', 'city' => 'Yaba', 'state' => 'Lagos', 'min' => 110000, 'max' => 140000, 'live_in' => false],
        ['title' => 'Laundry & Ironing Specialist', 'work_type' => 'Laundry Worker', 'city' => 'Ibadan', 'state' => 'Oyo', 'min' => 45000, 'max' => 60000, 'live_in' => false],
        ['title' => 'Nanny with Early Childhood Experience', 'work_type' => 'Nanny', 'city' => 'Garki', 'state' => 'FCT Abuja', 'min' => 85000, 'max' => 110000, 'live_in' => false],
        ['title' => 'Compound Driver & Errand Runner', 'work_type' => 'Driver', 'city' => 'Benin City', 'state' => 'Edo', 'min' => 65000, 'max' => 80000, 'live_in' => false],
    ];

    public function run(): void
    {
        $employers = UserSeeder::$employerUsers;
        $helpers = UserSeeder::$helperUsers;

        $jobs = [];
        foreach ($this->jobs as $i => $job) {
            $jobs[] = Job::create([
                'employer_id' => $employers[$i % count($employers)]->id,
                'title' => $job['title'],
                'work_type' => $job['work_type'],
                'description' => "We are looking for a reliable and experienced {$job['work_type']} for our home in {$job['city']}. You will work with a welcoming family that values respect and good communication. Previous experience and verifiable references are required.",
                'responsibilities' => 'Carry out daily duties to a high standard, maintain cleanliness and order, communicate clearly with the household, and treat the home with complete respect.',
                'requirements' => 'At least 2 years of relevant experience, good communication, honesty and trustworthiness. Verified references are an advantage.',
                'salary_min' => $job['min'],
                'salary_max' => $job['max'],
                'salary_type' => 'monthly',
                'location' => $job['city'],
                'state' => $job['state'],
                'city' => $job['city'],
                'working_hours' => '8am – 5pm, weekdays',
                'accommodation_available' => $job['live_in'],
                'employment_type' => $job['live_in'] ? 'live_in' : 'full_time',
                'start_date' => now()->addDays(random_int(7, 30)),
                'status' => JobStatus::Active,
                'expires_at' => now()->addDays(45),
            ]);
        }

        // Applications from helpers
        $statuses = [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::Interview, ApplicationStatus::Hired];
        foreach ($jobs as $jobIndex => $job) {
            $applicantCount = random_int(2, 6);
            $pool = $helpers;
            shuffle($pool);
            foreach (array_slice($pool, 0, $applicantCount) as $helper) {
                JobApplication::create([
                    'job_id' => $job->id,
                    'helper_id' => $helper->id,
                    'status' => $statuses[array_rand($statuses)],
                    'cover_note' => "Hello, I am interested in the {$job['work_type']} position. I have {$helper->helperProfile->years_experience} years of experience and I am available to start soon.",
                ]);
            }
        }

        // Interviews
        foreach ($helpers as $i => $helper) {
            if ($i >= 8) {
                break;
            }
            Interview::create([
                'job_id' => $jobs[$i % count($jobs)]->id,
                'employer_id' => $jobs[$i % count($jobs)]->employer_id,
                'helper_id' => $helper->id,
                'mode' => ['phone', 'video', 'in_person'][$i % 3],
                'scheduled_at' => now()->addDays(random_int(1, 7))->setTime(random_int(9, 16), 0),
                'status' => ['requested', 'accepted', 'completed'][$i % 3],
            ]);
        }

        $this->command?->info('Created jobs, applications and interviews.');
    }
}
