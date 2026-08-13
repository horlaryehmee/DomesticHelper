<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

class ReportPolicy
{
    public function create(User $user): bool
    {
        return $user->isEmployer();
    }

    public function view(User $user, Report $report): bool
    {
        return $user->isAdmin()
            || $user->id === $report->reporter_id
            || $user->id === $report->helper_id;
    }

    public function respond(User $user, Report $report): bool
    {
        return $user->id === $report->helper_id;
    }

    public function decide(User $user): bool
    {
        return $user->isAdmin() && $user->hasPermission('reports.decide');
    }
}
