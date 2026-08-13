<?php

namespace App\Services;

use App\Enums\EmploymentRecordStatus;
use App\Enums\EmploymentVerificationResponse;
use App\Enums\RecordVerificationStatus;
use App\Models\EmploymentRecord;
use App\Models\EmploymentVerification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EmploymentService
{
    public function __construct(
        private readonly TrustScoreService $trustScore,
    ) {
    }

    /**
     * Create an employment record when an employer confirms a hire.
     */
    public function startEmployment(User $employer, User $helper, array $data): EmploymentRecord
    {
        return DB::transaction(function () use ($employer, $helper, $data) {
            $record = EmploymentRecord::create([
                'employer_id' => $employer->id,
                'helper_id' => $helper->id,
                'job_role' => $data['job_role'],
                'start_date' => $data['start_date'] ?? now()->toDateString(),
                'salary' => $data['salary'] ?? null,
                'employment_type' => $data['employment_type'] ?? 'full_time',
                'location' => $data['location'] ?? null,
                'status' => EmploymentRecordStatus::Active,
            ]);

            AuditLogService::log('employment.started', $record);

            return $record;
        });
    }

    /**
     * Close out employment: end date, reason for leaving, performance rating.
     * The record becomes part of the helper's history once verified.
     */
    public function complete(EmploymentRecord $record, array $data): EmploymentRecord
    {
        $record->forceFill([
            'end_date' => $data['end_date'] ?? now()->toDateString(),
            'termination_reason' => $data['termination_reason'] ?? null,
            'performance_rating' => $data['performance_rating'] ?? null,
            'status' => EmploymentRecordStatus::Completed,
        ])->save();

        AuditLogService::log('employment.completed', $record);

        $this->applyCompletionTrustEvents($record);

        return $record;
    }

    /**
     * Request the previous employer to verify this employment record.
     */
    public function requestVerification(EmploymentRecord $record, ?User $requestedBy): EmploymentVerification
    {
        $verification = EmploymentVerification::create([
            'employment_record_id' => $record->id,
            'requested_by' => $requestedBy?->id,
            'requested_at' => now(),
        ]);

        AuditLogService::log('employment.verification_requested', $record);

        return $verification;
    }

    /**
     * Previous employer responds via a secure token link.
     * Confirmed => the record is verified and contributes to public history.
     */
    public function respondToVerification(
        EmploymentVerification $verification,
        EmploymentVerificationResponse $response,
        array $details = [],
        ?User $responder = null,
    ): EmploymentVerification {
        if ($verification->status !== EmploymentVerificationResponse::Pending) {
            abort(422, 'This verification request has already been answered.');
        }

        $verification->forceFill([
            'status' => $response,
            'confirmed_job_role' => $details['job_role'] ?? null,
            'confirmed_start_date' => $details['start_date'] ?? null,
            'confirmed_end_date' => $details['end_date'] ?? null,
            'confirmed_performance' => $details['performance'] ?? null,
            'response_notes' => $details['notes'] ?? null,
            'responded_by' => $responder?->id,
            'responded_at' => now(),
        ])->save();

        $record = $verification->employmentRecord;

        $record->verification_status = match ($response) {
            EmploymentVerificationResponse::Confirmed => RecordVerificationStatus::Verified,
            EmploymentVerificationResponse::Disputed => RecordVerificationStatus::Unverified, // goes to verification officer
            EmploymentVerificationResponse::UnableToConfirm => RecordVerificationStatus::Unverified,
            default => $record->verification_status,
        };

        if ($response === EmploymentVerificationResponse::Confirmed) {
            $record->verified_at = now();
            $record->verified_by = $responder?->id;
        }
        $record->save();

        AuditLogService::log('employment.verification_responded', $record, null, [
            'response' => $response->value,
            'verified' => $record->verification_status->value,
        ]);

        $this->applyCompletionTrustEvents($record);

        return $verification;
    }

    /**
     * Award trust score events for a verified, completed employment record.
     * Idempotent — guarded by "already earned" checks on the event history.
     */
    private function applyCompletionTrustEvents(EmploymentRecord $record): void
    {
        if ($record->verification_status !== RecordVerificationStatus::Verified) {
            return;
        }
        if ($record->status !== EmploymentRecordStatus::Completed && $record->status !== EmploymentRecordStatus::Terminated) {
            return;
        }

        $helper = $record->helper;
        $already = fn (string $type) => $helper->trustScoreEvents()
            ->where('event_type', $type)
            ->where('source_type', EmploymentRecord::class)
            ->where('source_id', $record->id)
            ->exists();

        if (! $already('job_completed')) {
            $this->trustScore->recordEvent($helper, 'job_completed', null, $record, 'Verified job completion');
        }

        $months = $record->start_date?->diffInMonths($record->end_date ?? now());
        if ($months >= 12 && ! $already('long_term_employment')) {
            $this->trustScore->recordEvent($helper, 'long_term_employment', null, $record, "Long-term employment ({$months} months)");
        }

        $verifiedCount = $helper->employmentRecordsAsHelper()
            ->where('verification_status', RecordVerificationStatus::Verified)
            ->whereIn('status', [EmploymentRecordStatus::Completed, EmploymentRecordStatus::Terminated])
            ->count();
        if ($verifiedCount >= 2 && ! $already('additional_employment')) {
            $this->trustScore->recordEvent($helper, 'additional_employment', null, $record, 'Additional verified employment');
        }
    }
}
