<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Aggregated metrics for dashboards (admin / employer / helper).
 */
class StatsService
{
    public function admin(): array
    {
        $users = fn (string $type) => User::query()->where('user_type', $type)->count();

        return [
            'total_users' => User::count(),
            'employers' => $users(UserType::Employer->value),
            'helpers' => $users(UserType::Helper->value),
            'verified_helpers' => User::whereHas('helperProfile', fn ($q) => $q->where('verification_status', 'verified'))->count(),
            'helpers_under_review' => User::whereHas('helperProfile', fn ($q) => $q->where('verification_status', 'under_review'))->count(),
            'flagged_cases' => User::whereHas('helperProfile', fn ($q) => $q->where('verification_status', 'flagged'))->count(),
            'pending_verifications' => \App\Models\IdentityVerification::where('status', 'pending')->count(),
            'pending_reports' => \App\Models\Report::whereIn('status', ['submitted', 'under_review', 'awaiting_helper_response'])->count(),
            'pending_disputes' => \App\Models\Dispute::whereIn('status', ['submitted', 'under_review', 'awaiting_response'])->count(),
            'pending_reviews' => \App\Models\Review::where('status', 'pending')->count(),
            'active_jobs' => \App\Models\Job::where('status', 'active')->count(),
            'completed_hires' => \App\Models\EmploymentRecord::whereIn('status', ['completed', 'terminated'])->count(),
            'revenue' => Payment::where('status', PaymentStatus::Successful)->sum('amount') / 100,
            'verification_report_purchases' => \App\Models\VerificationReport::whereIn('status', ['paid', 'generated'])->count(),
            'signups_30d' => $this->trend('users', 30),
            'jobs_30d' => $this->trend('jobs', 30),
            'revenue_30d' => $this->revenueTrend(30),
        ];
    }

    public function employer(User $employer): array
    {
        return [
            'active_jobs' => $employer->jobs()->where('status', 'active')->count(),
            'total_applications' => \App\Models\JobApplication::whereHas('job', fn ($q) => $q->where('employer_id', $employer->id))->count(),
            'current_hires' => $employer->employmentRecordsAsEmployer()->where('status', 'active')->count(),
            'completed_hires' => $employer->employmentRecordsAsEmployer()->whereIn('status', ['completed', 'terminated'])->count(),
            'saved_helpers' => \App\Models\SavedHelper::where('employer_id', $employer->id)->count(),
            'reports_purchased' => \App\Models\VerificationReport::where('purchased_by', $employer->id)->whereIn('status', ['paid', 'generated'])->count(),
            'interviews_pending' => \App\Models\Interview::where('employer_id', $employer->id)->where('status', 'requested')->count(),
            'reviews_pending' => $employer->employmentRecordsAsEmployer()
                ->whereIn('status', ['completed', 'terminated'])
                ->whereDoesntHave('review')
                ->count(),
        ];
    }

    public function helper(User $helper): array
    {
        $profile = $helper->helperProfile;

        return [
            'profile_views' => \App\Models\HelperProfileView::where('helper_id', $helper->id)->count(),
            'applications' => \App\Models\JobApplication::where('helper_id', $helper->id)->count(),
            'interviews_pending' => \App\Models\Interview::where('helper_id', $helper->id)->where('status', 'requested')->count(),
            'active_employment' => $helper->employmentRecordsAsHelper()->where('status', 'active')->count(),
            'verified_jobs' => $helper->employmentRecordsAsHelper()->where('verification_status', 'verified')->count(),
            'reviews' => $helper->reviewsReceived()->where('status', 'approved')->count(),
            'average_rating' => round($helper->reviewsReceived()->where('status', 'approved')->avg('rating') ?? 0, 1),
            'open_reports' => $helper->reportsAsHelper()->where('status', '!=', 'closed')->count(),
            'open_disputes' => \App\Models\Dispute::where('helper_id', $helper->id)->whereIn('status', ['submitted', 'under_review', 'awaiting_response'])->count(),
            'profile_completion' => app(VerificationService::class)->completionPercent($helper),
            'verification_status' => $profile?->verification_status?->value,
        ];
    }

    /**
     * Daily count trend for a table over N days.
     */
    public function trend(string $table, int $days): Collection
    {
        $start = now()->subDays($days - 1)->startOfDay();

        $rows = DB::table($table)
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->pluck('count', 'day');

        $series = collect();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $series->push(['date' => $date, 'count' => (int) ($rows[$date] ?? 0)]);
        }

        return $series;
    }

    public function revenueTrend(int $days): Collection
    {
        $start = now()->subDays($days - 1)->startOfDay();

        $rows = Payment::where('status', PaymentStatus::Successful)
            ->where('paid_at', '>=', $start)
            ->selectRaw('DATE(paid_at) as day, SUM(amount) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = collect();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $series->push(['date' => $date, 'total' => (int) (($rows[$date] ?? 0) / 100)]);
        }

        return $series;
    }
}
