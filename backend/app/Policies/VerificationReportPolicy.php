<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VerificationReport;

class VerificationReportPolicy
{
    public function view(User $user, VerificationReport $report): bool
    {
        return $user->isAdmin() || $user->id === $report->purchased_by;
    }

    public function purchase(User $user): bool
    {
        return $user->isEmployer();
    }
}
