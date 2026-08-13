<?php

namespace App\Services;

use App\Enums\ReportStatus;
use App\Enums\ReportOutcome;
use App\Enums\ReportCategory;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Report / complaint workflow.
 *
 * A report NEVER touches the trust score on submission — not even when it
 * includes employment details or evidence. Score impact happens only after
 * admin verification, through the TrustScoreService.
 */
class ReportService
{
    public function __construct(
        private readonly TrustScoreService $trustScore,
    ) {
    }

    public function submit(User $reporter, User $helper, array $data): Report
    {
        $report = DB::transaction(function () use ($reporter, $helper, $data) {
            $report = Report::create([
                'helper_id' => $helper->id,
                'reporter_id' => $reporter->id,
                'employment_record_id' => $data['employment_record_id'] ?? null,
                'category' => $data['category'],
                'description' => $data['description'],
                'status' => ReportStatus::Submitted,
            ]);

            AuditLogService::log('report.submitted', $report, null, [
                'category' => $report->category->value,
            ]);

            return $report;
        });

        // Notify the helper (business rule #5) — handled by the controller via
        // NotificationService after evidence has been attached.

        return $report;
    }

    /**
     * The helper's right of reply — recorded and surfaced to the admin only.
     */
    public function helperRespond(Report $report, User $helper, string $response): void
    {
        abort_unless($report->helper_id === $helper->id, 403);

        $report->forceFill([
            'helper_response' => $response,
            'status' => ReportStatus::UnderReview,
        ])->save();

        AuditLogService::log('report.helper_responded', $report);
    }

    /**
     * Admin decision. Only 'verified' outcomes create trust score events.
     */
    public function decide(
        Report $report,
        ReportOutcome $outcome,
        ?User $admin,
        string $decision,
    ): Report {
        $report->forceFill([
            'outcome' => $outcome,
            'admin_decision' => $decision,
            'decided_by' => $admin?->id,
            'decided_at' => now(),
            'status' => ReportStatus::Closed,
        ])->save();

        if ($outcome === ReportOutcome::Verified) {
            $eventType = $report->category === ReportCategory::JobAbandonment
                ? 'job_abandonment'
                : 'complaint_verified';

            $this->trustScore->recordEvent(
                $report->helper,
                $eventType,
                null,
                $report,
                "Admin-verified report ({$report->category->value})",
                $admin,
            );
        }

        AuditLogService::log('report.decided', $report, null, [
            'outcome' => $outcome->value,
            'decision' => $decision,
        ]);

        return $report;
    }
}
