<?php

namespace App\Services;

use App\Enums\VerificationReportStatus;
use App\Models\User;
use App\Models\VerificationReport;

/**
 * Builds the paid verification report from a frozen snapshot of
 * public-approved data. The snapshot is immutable once generated.
 */
class VerificationReportService
{
    public function __construct(
        private readonly VerificationService $verificationService,
    ) {
    }

    public function generateAfterPayment(VerificationReport $report): VerificationReport
    {
        if ($report->status === VerificationReportStatus::Generated) {
            return $report;
        }

        $report->forceFill([
            'status' => VerificationReportStatus::Generated,
            'snapshot' => $this->buildSnapshot($report->helper),
            'generated_at' => now(),
        ])->save();

        AuditLogService::log('verification_report.generated', $report);

        return $report;
    }

    public function buildSnapshot(User $helper): array
    {
        $profile = $helper->helperProfile;
        $trustScore = $helper->trustScore;

        $approvedReviews = $helper->reviewsReceived()
            ->where('status', 'approved')
            ->with('employmentRecord:id,uuid,job_role,start_date,end_date')
            ->get();

        $verifiedEmployment = $helper->employmentRecordsAsHelper()
            ->where('verification_status', 'verified')
            ->orderByDesc('start_date')
            ->get(['uuid', 'job_role', 'start_date', 'end_date', 'location', 'verification_status'])
            ->makeHidden(['id']);

        return [
            'helper' => [
                'uuid' => $helper->uuid,
                'name' => $helper->full_name,
                'photo_url' => $profile?->photo_path ? asset('storage/'.$profile->photo_path) : null,
                'city' => $profile?->city,
                'state' => $profile?->state,
            ],
            'identity_verification' => $this->verificationService->badgesFor($helper),
            'trust_score' => [
                'score' => $trustScore?->score ?? 50,
                'category' => $trustScore?->category?->label() ?? 'Moderate Trust',
                'calculated_at' => $trustScore?->calculated_at?->toIso8601String(),
            ],
            'employment_history' => $verifiedEmployment->map(fn ($r) => [
                'job_role' => $r->job_role,
                'start_date' => $r->start_date?->toDateString(),
                'end_date' => $r->end_date?->toDateString(),
                'location' => $r->location,
            ]),
            'reviews' => $approvedReviews->map(fn ($r) => [
                'rating' => $r->rating,
                'feedback' => $r->feedback,
                'work_type' => $r->work_type,
                'duration_worked' => $r->duration_worked,
                'job_role' => $r->employmentRecord?->job_role,
            ]),
            'average_rating' => round($approvedReviews->avg('rating') ?? 0, 1),
            'verified_jobs_count' => $verifiedEmployment->count(),
            'generated_at' => now()->toIso8601String(),
            'disclaimer' => 'This report reflects information verified by Domestic Helper at the time of generation. It is provided to support hiring decisions and is not a guarantee of future conduct. Report only valid for the purchasing employer.',
        ];
    }
}
