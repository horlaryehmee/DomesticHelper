<?php

namespace App\Providers;

use App\Models\Conversation;
use App\Models\Dispute;
use App\Models\EmploymentRecord;
use App\Models\Evidence;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Payment;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use App\Models\VerificationReport;
use App\Policies\ConversationPolicy;
use App\Policies\DisputePolicy;
use App\Policies\EmploymentRecordPolicy;
use App\Policies\EvidencePolicy;
use App\Policies\InterviewPolicy;
use App\Policies\JobPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\ReportPolicy;
use App\Policies\ReviewPolicy;
use App\Policies\UserPolicy;
use App\Policies\VerificationReportPolicy;
use App\Services\Search\HelperSearchEngine;
use App\Services\Search\MySqlHelperSearchEngine;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    protected $policies = [
        Review::class => ReviewPolicy::class,
        Report::class => ReportPolicy::class,
        Dispute::class => DisputePolicy::class,
        Job::class => JobPolicy::class,
        EmploymentRecord::class => EmploymentRecordPolicy::class,
        Interview::class => InterviewPolicy::class,
        Conversation::class => ConversationPolicy::class,
        Payment::class => PaymentPolicy::class,
        VerificationReport::class => VerificationReportPolicy::class,
        Evidence::class => EvidencePolicy::class,
        User::class => UserPolicy::class,
    ];

    public function register(): void
    {
        // Search engine abstraction — swap for Meilisearch/ES later.
        $this->app->bind(HelperSearchEngine::class, MySqlHelperSearchEngine::class);
    }

    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Super admin bypasses all gates.
        Gate::before(fn (User $user) => $user->isSuperAdmin() ? true : null);

        // Permission-slug gates for staff capabilities.
        Gate::define('admin.permission', fn (User $user, string $permission) => $user->hasPermission($permission));

        // API throttling
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('webhooks', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
