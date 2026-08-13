<?php

namespace Database\Seeders;

use App\Enums\DisputeStatus;
use App\Enums\ReportOutcome;
use App\Enums\ReportStatus;
use App\Models\Dispute;
use App\Models\EmploymentRecord;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportService;
use App\Services\TrustScoreService;
use Illuminate\Database\Seeder;

class ReportAndDisputeSeeder extends Seeder
{
    public function run(ReportService $reports, TrustScoreService $trustScore): void
    {
        $employers = UserSeeder::$employerUsers;
        $helpers = UserSeeder::$helperUsers;
        $admin = User::where('email', 'admin@domestichelper.test')->first();

        $records = EmploymentRecord::query()
            ->where('status', 'completed')
            ->get()
            ->groupBy(fn ($r) => $r->helper_id);

        $scenarios = [
            // [helper index, category, outcome, response]
            [17, 'theft', null, null],                          // open — pending admin review
            [18, 'job_abandonment', 'verified', 'I left because I was not paid for two months. I dispute this report.'], // verified
            [19, 'misconduct', 'unsubstantiated', 'I have never behaved this way. My references speak for me.'],          // cleared
            [20, 'poor_performance', 'dismissed', 'This is not a fair description of my work.'],                          // dismissed
            [21, 'fraud', null, null],                          // open
        ];

        $created = [];
        foreach ($scenarios as [$helperIndex, $category, $outcome, $helperResponse]) {
            $helper = $helpers[$helperIndex];
            $employer = $employers[$helperIndex % count($employers)];
            $record = $records[$helper->id][0] ?? null;

            $report = $reports->submit($employer, $helper, [
                'employment_record_id' => $record?->id,
                'category' => $category,
                'description' => match ($category) {
                    'theft' => 'Some household items were noticed missing after the employment period. I am reporting this for documentation and review.',
                    'job_abandonment' => 'The helper left the job without any notice and did not return calls afterwards.',
                    'misconduct' => 'There were repeated incidents of unprofessional conduct during the employment period.',
                    'poor_performance' => 'The standard of work was significantly below what was agreed upon.',
                    'fraud' => 'I have concerns about the accuracy of the information provided during hiring.',
                    default => 'Please review this concern.',
                },
            ]);

            if ($helperResponse) {
                $reports->helperRespond($report, $helper, $helperResponse);
            }

            if ($outcome) {
                $reports->decide($report, ReportOutcome::from($outcome), $admin, 'Reviewed by our team. Decision recorded with supporting context.');
            }

            $created[] = [$helper, $report];
        }

        // Disputes — one open dispute against a trust score event, one resolved
        $event = \App\Models\TrustScoreEvent::query()->latest()->first();
        if ($event) {
            Dispute::create([
                'helper_id' => $event->helper_id,
                'disputable_type' => $event->getMorphClass(),
                'disputable_id' => $event->id,
                'reason' => 'Incorrect trust score deduction',
                'explanation' => 'I believe the complaint that led to this deduction was not verified correctly. I have documents showing the situation was different.',
                'status' => DisputeStatus::Submitted,
            ]);
        }

        $this->command?->info('Created reports and disputes.');
    }
}
