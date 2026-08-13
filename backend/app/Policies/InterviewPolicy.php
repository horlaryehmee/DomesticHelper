<?php

namespace App\Policies;

use App\Models\Interview;
use App\Models\User;

class InterviewPolicy
{
    public function view(User $user, Interview $interview): bool
    {
        return $user->isAdmin()
            || $user->id === $interview->employer_id
            || $user->id === $interview->helper_id;
    }

    public function create(User $user): bool
    {
        return $user->isEmployer();
    }

    public function respond(User $user, Interview $interview): bool
    {
        return $user->id === $interview->helper_id;
    }

    public function update(User $user, Interview $interview): bool
    {
        return $user->id === $interview->employer_id || $user->id === $interview->helper_id;
    }
}
