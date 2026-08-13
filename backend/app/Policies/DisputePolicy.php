<?php

namespace App\Policies;

use App\Models\Dispute;
use App\Models\User;

class DisputePolicy
{
    public function create(User $user): bool
    {
        return $user->isHelper();
    }

    public function view(User $user, Dispute $dispute): bool
    {
        return $user->isAdmin() || $user->id === $dispute->helper_id;
    }

    public function decide(User $user): bool
    {
        return $user->isAdmin() && $user->hasPermission('disputes.decide');
    }
}
