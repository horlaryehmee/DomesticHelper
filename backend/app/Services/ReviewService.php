<?php

namespace App\Services;

use App\Enums\ReviewStatus;
use App\Models\EmploymentRecord;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReviewService
{
    public function __construct(
        private readonly TrustScoreService $trustScore,
    ) {
    }

    /**
     * Submit a review tied to a real employment record. Validation of the
     * employment relationship happens in ReviewPolicy before this runs.
     */
    public function create(User $employer, User $helper, EmploymentRecord $record, array $data): Review
    {
        abort_unless($record->employer_id === $employer->id, 403);
        abort_unless($record->helper_id === $helper->id, 403);
        abort_if(Review::query()->where('employment_record_id', $record->id)->exists(), 422, 'A review has already been submitted for this employment.');

        $review = Review::create([
            'helper_id' => $helper->id,
            'employer_id' => $employer->id,
            'employment_record_id' => $record->id,
            'rating' => $data['rating'],
            'work_type' => $data['work_type'] ?? null,
            'duration_worked' => $data['duration_worked'] ?? null,
            'feedback' => $data['feedback'],
            'status' => ReviewStatus::Pending, // always moderated
        ]);

        AuditLogService::log('review.submitted', $review);

        return $review;
    }

    /**
     * Moderation decision. Approval of a positive review (4-5 stars) awards
     * the verified-review trust event exactly once.
     */
    public function moderate(Review $review, ReviewStatus $status, ?User $moderator, ?string $note = null): Review
    {
        $review->forceFill([
            'status' => $status,
            'moderated_by' => $moderator?->id,
            'moderated_at' => now(),
            'moderation_note' => $note,
        ])->save();

        if ($status === ReviewStatus::Approved && $review->rating >= 4) {
            $already = $review->helper->trustScoreEvents()
                ->where('event_type', 'positive_review')
                ->where('source_type', Review::class)
                ->where('source_id', $review->id)
                ->exists();

            if (! $already) {
                $this->trustScore->recordEvent(
                    $review->helper,
                    'positive_review',
                    null,
                    $review,
                    "Verified positive review ({$review->rating}/5)",
                    $moderator,
                );
            }
        }

        AuditLogService::log('review.moderated', $review, null, [
            'status' => $status->value,
            'note' => $note,
        ]);

        return $review;
    }

    public function addResponse(Review $review, User $user, string $content): void
    {
        abort_unless(
            $user->id === $review->helper_id || $user->id === $review->employer_id,
            403,
        );

        $review->responses()->create([
            'user_id' => $user->id,
            'content' => $content,
        ]);
    }
}
