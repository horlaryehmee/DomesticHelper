<?php

namespace App\Policies;

use App\Models\Evidence;
use App\Models\User;

class EvidencePolicy
{
    /**
     * Evidence downloads are access-controlled: uploader, participants of the
     * parent entity, or staff. There are no public evidence URLs.
     */
    public function view(User $user, Evidence $evidence): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->id === $evidence->uploader_id) {
            return true;
        }

        $parent = $evidence->evidenceable;
        if (! $parent) {
            return false;
        }

        return match (true) {
            $parent instanceof \App\Models\Report => $user->id === $parent->reporter_id || $user->id === $parent->helper_id,
            $parent instanceof \App\Models\Dispute => $user->id === $parent->helper_id,
            $parent instanceof \App\Models\EmploymentRecord => $user->id === $parent->employer_id || $user->id === $parent->helper_id,
            $parent instanceof \App\Models\IdentityVerification => $user->id === $parent->user_id,
            default => false,
        };
    }
}
