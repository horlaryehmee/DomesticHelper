<?php

namespace App\Policies;

use App\Models\Job;
use App\Models\User;

class JobPolicy
{
    public function viewAny(?User $user): bool
    {
        return true; // public browsing
    }

    public function view(?User $user, Job $job): bool
    {
        if ($job->status->value === 'active') {
            return true;
        }
        return $user?->isAdmin() || $user?->id === $job->employer_id;
    }

    public function create(User $user): bool
    {
        return $user->isEmployer();
    }

    public function update(User $user, Job $job): bool
    {
        return $user->id === $job->employer_id;
    }

    public function delete(User $user, Job $job): bool
    {
        return $user->id === $job->employer_id;
    }

    public function manageApplications(User $user, Job $job): bool
    {
        return $user->id === $job->employer_id;
    }

    public function apply(User $user, Job $job): bool
    {
        return $user->isHelper() && $job->status->value === 'active';
    }
}
