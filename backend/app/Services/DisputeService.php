<?php

namespace App\Services;

use App\Enums\DisputeStatus;
use App\Enums\ReviewStatus;
use App\Models\Dispute;
use App\Models\Review;
use App\Models\TrustScoreEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class DisputeService
{
    public function __construct(
        private readonly TrustScoreService $trustScore,
    ) {
    }

    public function submit(User $helper, Model $disputable, string $reason, string $explanation): Dispute
    {
        abort_unless(in_array($disputable::class, [Review::class, \App\Models\Report::class, TrustScoreEvent::class, \App\Models\IdentityVerification::class], true), 422, 'This item cannot be disputed.');

        $dispute = Dispute::create([
            'helper_id' => $helper->id,
            'disputable_type' => $disputable->getMorphClass(),
            'disputable_id' => $disputable->getKey(),
            'reason' => $reason,
            'explanation' => $explanation,
            'status' => DisputeStatus::Submitted,
        ]);

        if ($disputable instanceof Review) {
            $disputable->forceFill(['status' => ReviewStatus::Disputed])->save();
        }

        AuditLogService::log('dispute.submitted', $dispute);

        return $dispute;
    }

    /**
     * Admin resolves the dispute. When upheld against a trust score event,
     * the event is reversed so the helper's score is restored.
     */
    public function decide(Dispute $dispute, bool $uphold, ?User $admin, string $decision): Dispute
    {
        $dispute->forceFill([
            'status' => $uphold ? DisputeStatus::Resolved : DisputeStatus::Rejected,
            'resolution_decision' => $decision,
            'resolved_by' => $admin?->id,
            'resolved_at' => now(),
        ])->save();

        if ($uphold && $dispute->disputable instanceof TrustScoreEvent) {
            $this->trustScore->reverseEvent($dispute->disputable, $admin, $decision);
        }

        if ($uphold && $dispute->disputable instanceof Review && $dispute->disputable->status === ReviewStatus::Disputed) {
            $dispute->disputable->forceFill(['status' => ReviewStatus::Removed])->save();
            AuditLogService::log('review.removed_via_dispute', $dispute->disputable, null, ['decision' => $decision]);
        }

        AuditLogService::log('dispute.decided', $dispute, null, [
            'upheld' => $uphold,
            'decision' => $decision,
        ]);

        return $dispute;
    }
}
