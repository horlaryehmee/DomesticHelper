<?php

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    /**
     * A review may only exist on top of a real employment relationship,
     * and only for employment that has actually ended (or is active).
     */
    public function create(User $user, $employmentRecord): bool
    {
        return $employmentRecord !== null
            && in_array($user->id, [(int) $employmentRecord->employer_id, (int) $employmentRecord->helper_id], true)
            && in_array($employmentRecord->status->value, ['completed', 'terminated', 'active'], true);
    }

    public function view(User $user, Review $review): bool
    {
        return $user->isAdmin()
            || $user->id === $review->helper_id
            || $user->id === $review->employer_id;
    }

    public function respond(User $user, Review $review): bool
    {
        return $user->id === $review->helper_id || $user->id === $review->employer_id;
    }

    public function moderate(User $user): bool
    {
        return $user->isAdmin() && $user->hasPermission('reviews.moderate');
    }
}
