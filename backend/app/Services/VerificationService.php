<?php

namespace App\Services;

use App\Enums\HelperVerificationStatus;
use App\Enums\IdentityVerificationStatus;
use App\Enums\IdentityVerificationType;
use App\Models\HelperProfile;
use App\Models\IdentityVerification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class VerificationService
{
    /**
     * The badge keys a helper has genuinely earned. A badge is only ever
     * true when the underlying verification actually completed.
     */
    public function badgesFor(User $helper): array
    {
        if (! $helper->isHelper()) {
            return [];
        }

        $badges = [];
        if ($helper->phone_verified_at) {
            $badges[] = 'phone_verified';
        }
        if ($helper->email_verified_at) {
            $badges[] = 'email_verified';
        }

        $verifications = IdentityVerification::query()
            ->where('user_id', $helper->id)
            ->where('status', IdentityVerificationStatus::Approved)
            ->get()
            ->keyBy(fn ($v) => $v->type->value);

        if ($verifications->has('photo')) {
            $badges[] = 'photo_verified';
        }
        if ($verifications->has('nin')) {
            $badges[] = 'nin_verified';
        }
        if ($verifications->has('address')) {
            $badges[] = 'address_verified';
        }
        if ($verifications->has('photo') && $verifications->has('nin')) {
            $badges[] = 'identity_verified';
        }

        $profile = $helper->helperProfile;
        if ($profile?->profile_completed && ($verifications->has('photo') || $verifications->has('nin'))) {
            $badges[] = 'profile_verified';
        }

        $hasVerifiedEmployment = $helper->employmentRecordsAsHelper()
            ->where('verification_status', 'verified')
            ->exists();
        if ($hasVerifiedEmployment) {
            $badges[] = 'employment_verified';
        }

        if ($helper->referenceChecks()->where('status', 'completed')->exists()) {
            $badges[] = 'reference_checked';
        }

        return array_values(array_unique($badges));
    }

    /**
     * Request an identity verification step (photo / NIN / address).
     * Throws when the helper does not own the submitted data.
     */
    public function request(User $helper, IdentityVerificationType $type): IdentityVerification
    {
        $verification = IdentityVerification::firstOrCreate(
            ['user_id' => $helper->id, 'type' => $type],
            ['status' => IdentityVerificationStatus::Pending],
        );

        $this->syncHelperStatus($helper);

        AuditLogService::log('identity_verification.requested', $verification);

        return $verification;
    }

    /**
     * Admin/verification officer decision on an identity verification.
     */
    public function decide(
        IdentityVerification $verification,
        IdentityVerificationStatus $status,
        ?User $reviewer,
        ?string $notes = null,
    ): IdentityVerification {
        $wasApproved = $verification->status === IdentityVerificationStatus::Approved;

        $verification->forceFill([
            'status' => $status,
            'reviewed_by' => $reviewer?->id,
            'reviewed_at' => now(),
            'verified_at' => $status === IdentityVerificationStatus::Approved ? now() : null,
            'private_notes' => $notes,
        ])->save();

        if ($status === IdentityVerificationStatus::Approved && $verification->type === IdentityVerificationType::Nin) {
            $this->applyNinApproval($verification);
        }

        if ($wasApproved && $status !== IdentityVerificationStatus::Approved) {
            $this->syncHelperStatus($verification->user);
        }

        $this->syncHelperStatus($verification->user);

        AuditLogService::log('identity_verification.decided', $verification, null, [
            'type' => $verification->type->value,
            'status' => $status->value,
            'notes' => $notes,
        ]);

        return $verification;
    }

    private function applyNinApproval(IdentityVerification $verification): void
    {
        // Future hook: call external NIN verification provider here.
        // Provider abstraction lives in IdentityVerificationProviderInterface.
    }

    /**
     * Keep the helper's aggregate verification status consistent with reality.
     */
    public function syncHelperStatus(User $helper): void
    {
        if (! $helper->isHelper()) {
            return;
        }

        $profile = $helper->helperProfile;
        if (! $profile) {
            return;
        }

        $verifications = IdentityVerification::query()
            ->where('user_id', $helper->id)
            ->get()
            ->keyBy(fn ($v) => $v->type->value);

        $flaggedReport = $helper->reportsAsHelper()->where('status', '!=', 'closed')
            ->where(function ($q) {
                $q->where('outcome', 'verified')->orWhereNull('outcome');
            })->exists();

        $identityVerified = isset($verifications['nin']) && isset($verifications['photo'])
            && $verifications['nin']->status === IdentityVerificationStatus::Approved
            && $verifications['photo']->status === IdentityVerificationStatus::Approved;

        $pending = $verifications->contains(fn ($v) => $v->status === IdentityVerificationStatus::Pending);

        $status = match (true) {
            $flaggedReport => HelperVerificationStatus::Flagged,
            $identityVerified => HelperVerificationStatus::Verified,
            $pending => HelperVerificationStatus::UnderReview,
            default => HelperVerificationStatus::Unverified,
        };

        if ($profile->verification_status !== $status) {
            $profile->forceFill(['verification_status' => $status])->save();
        }
    }

    /**
     * Recompute the profile-completion percentage.
     */
    public function completionPercent(User $user): int
    {
        if ($user->isHelper()) {
            $p = $user->helperProfile;
            if (! $p) {
                return 0;
            }
            $checks = [
                $user->first_name && $user->last_name,
                (bool) $user->phone,
                (bool) $user->phone_verified_at,
                (bool) $p->photo_path,
                (bool) $p->date_of_birth,
                (bool) $p->gender,
                (bool) $p->state,
                (bool) $p->nin_hash,
                $p->skills()->exists(),
                $p->years_experience > 0,
                (bool) $p->expected_salary_min,
                (bool) $p->bio,
            ];
            $percent = (int) round(count(array_filter($checks)) / count($checks) * 100);
            if ($p->profile_completed !== ($percent >= 100)) {
                $p->forceFill(['profile_completed' => $percent >= 100])->save();
            }
            return $percent;
        }

        $p = $user->employerProfile;
        if (! $p) {
            return 0;
        }
        $checks = [
            $user->first_name && $user->last_name,
            (bool) $user->phone,
            (bool) $user->phone_verified_at,
            (bool) $user->email_verified_at,
            (bool) $p->city,
            (bool) $p->state,
        ];
        $percent = (int) round(count(array_filter($checks)) / count($checks) * 100);
        if ($p->profile_completed !== ($percent >= 100)) {
            $p->forceFill(['profile_completed' => $percent >= 100])->save();
        }
        return $percent;
    }
}
