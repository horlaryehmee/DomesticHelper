<?php

namespace App\Policies;

use App\Models\EmploymentRecord;
use App\Models\User;

class EmploymentRecordPolicy
{
    public function view(User $user, EmploymentRecord $record): bool
    {
        return $user->isAdmin()
            || $user->id === $record->employer_id
            || $user->id === $record->helper_id;
    }

    public function create(User $user): bool
    {
        return $user->isEmployer();
    }

    public function complete(User $user, EmploymentRecord $record): bool
    {
        return $user->id === $record->employer_id;
    }

    public function requestVerification(User $user, EmploymentRecord $record): bool
    {
        return $user->isAdmin()
            || $user->id === $record->employer_id
            || $user->id === $record->helper_id;
    }

    public function verify(User $user): bool
    {
        return $user->isAdmin() && $user->hasPermission('employment.verify');
    }
}
