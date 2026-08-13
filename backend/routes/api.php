<?php

use App\Http\Controllers\Api\Admin\AdminAuditLogController;
use App\Http\Controllers\Api\Admin\AdminDisputeController;
use App\Http\Controllers\Api\Admin\AdminJobController;
use App\Http\Controllers\Api\Admin\AdminPaymentController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminSettingController;
use App\Http\Controllers\Api\Admin\AdminTrustScoreController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminVerificationController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\OtpController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DisputeController;
use App\Http\Controllers\Api\EmployerJobController;
use App\Http\Controllers\Api\EmployerProfileController;
use App\Http\Controllers\Api\EmploymentController;
use App\Http\Controllers\Api\HelperApplicationController;
use App\Http\Controllers\Api\HelperController;
use App\Http\Controllers\Api\HelperProfileController;
use App\Http\Controllers\Api\InterviewController;
use App\Http\Controllers\Api\MessagingController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReferenceCheckController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SavedHelperController;
use App\Http\Controllers\Api\VerificationReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public / no-auth
|--------------------------------------------------------------------------
*/

// Auth
Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register/employer', [AuthController::class, 'registerEmployer']);
    Route::post('/register/helper', [AuthController::class, 'registerHelper']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/send', [OtpController::class, 'send']);
    Route::post('/otp/verify', [OtpController::class, 'verify']);
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset', [PasswordResetController::class, 'reset']);
});

// Meta (skills, locations, enum options)
Route::get('/meta', [MetaController::class, 'index']);

// Helper discovery
Route::get('/helpers', [HelperController::class, 'index']);
Route::get('/helpers/{helper}', [HelperController::class, 'show'])->whereUuid('helper');
Route::get('/helpers/{helper}/reviews', [HelperController::class, 'reviews'])->whereUuid('helper');
Route::get('/helpers/{helper}/employment', [HelperController::class, 'employment'])->whereUuid('helper');

// Jobs
Route::get('/jobs', [App\Http\Controllers\Api\JobController::class, 'index']);
Route::get('/jobs/{job}', [App\Http\Controllers\Api\JobController::class, 'show'])->whereUuid('job');

// Evidence downloads — authenticated + authorized, private disk
Route::get('/evidence/{evidence}/download', [App\Http\Controllers\Api\EvidenceController::class, 'download'])
    ->whereUuid('evidence')
    ->middleware('auth:sanctum');

// Employment verification — secure token link (no account required)
Route::get('/verify-employment/{token}', [EmploymentController::class, 'verifyToken']);
Route::post('/verify-employment/{token}', [EmploymentController::class, 'respondByToken']);

// Payments — provider webhooks
Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook'])
    ->middleware('throttle:webhooks');

/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/password/change', [PasswordResetController::class, 'change']);

    Route::get('/dashboard', DashboardController::class);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Messaging (both roles)
    Route::get('/conversations', [MessagingController::class, 'index']);
    Route::post('/conversations/with/{other}', [MessagingController::class, 'open'])->whereUuid('other');
    Route::get('/conversations/{conversation}', [MessagingController::class, 'show'])->whereUuid('conversation');
    Route::post('/conversations/{conversation}/messages', [MessagingController::class, 'send'])->whereUuid('conversation');
    Route::post('/conversations/{conversation}/block', [MessagingController::class, 'block'])->whereUuid('conversation');
    Route::post('/conversations/{conversation}/unblock', [MessagingController::class, 'unblock'])->whereUuid('conversation');

    // Employment (shared)
    Route::get('/employments', [EmploymentController::class, 'index']);
    Route::get('/employments/{record}', [EmploymentController::class, 'show'])->whereUuid('record');

    // Interviews (shared views)
    Route::get('/interviews', [InterviewController::class, 'index']);
    Route::get('/interviews/{interview}', [InterviewController::class, 'show'])->whereUuid('interview');
    Route::patch('/interviews/{interview}', [InterviewController::class, 'update'])->whereUuid('interview');

    // Payments (owner views)
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::post('/payments/{payment}/verify', [PaymentController::class, 'verify'])->whereUuid('payment');
    Route::post('/payments/{payment}/sandbox-complete', [PaymentController::class, 'simulateSandbox'])->whereUuid('payment');

    /*
    | Employer routes
    */
    Route::middleware('user_type:employer')->group(function () {
        Route::get('/employers/profile', [EmployerProfileController::class, 'show']);
        Route::put('/employers/profile', [EmployerProfileController::class, 'update']);

        // Saved helpers & lists
        Route::get('/employers/saved-helpers', [SavedHelperController::class, 'index']);
        Route::post('/employers/saved-helpers/{helper}', [SavedHelperController::class, 'save'])->whereUuid('helper');
        Route::delete('/employers/saved-helpers/{helper}', [SavedHelperController::class, 'remove'])->whereUuid('helper');
        Route::get('/employers/saved-helper-lists', [SavedHelperController::class, 'lists']);
        Route::post('/employers/saved-helper-lists', [SavedHelperController::class, 'storeList']);
        Route::put('/employers/saved-helper-lists/{list}', [SavedHelperController::class, 'updateList']);
        Route::delete('/employers/saved-helper-lists/{list}', [SavedHelperController::class, 'deleteList']);

        // Job management
        Route::get('/employers/jobs', [EmployerJobController::class, 'index']);
        Route::post('/employers/jobs', [EmployerJobController::class, 'store']);
        Route::get('/employers/jobs/{job}', [EmployerJobController::class, 'show'])->whereUuid('job');
        Route::put('/employers/jobs/{job}', [EmployerJobController::class, 'update'])->whereUuid('job');
        Route::patch('/employers/jobs/{job}/status', [EmployerJobController::class, 'setStatus'])->whereUuid('job');
        Route::delete('/employers/jobs/{job}', [EmployerJobController::class, 'destroy'])->whereUuid('job');
        Route::get('/employers/jobs/{job}/applications', [EmployerJobController::class, 'jobApplications'])->whereUuid('job');

        // Applications
        Route::get('/employers/applications', [EmployerJobController::class, 'applications']);
        Route::patch('/employers/applications/{application}/status', [EmployerJobController::class, 'setApplicationStatus'])->whereUuid('application');

        // Hiring flow
        Route::post('/employments', [EmploymentController::class, 'start']);
        Route::post('/employments/{record}/complete', [EmploymentController::class, 'complete'])->whereUuid('record');
        Route::post('/employments/{record}/request-verification', [EmploymentController::class, 'requestVerification'])->whereUuid('record');
        Route::post('/interviews', [InterviewController::class, 'store']);
        Route::post('/interviews/{interview}/respond', [InterviewController::class, 'respond'])->whereUuid('interview');

        // Reviews
        Route::post('/reviews', [ReviewController::class, 'store']);

        // Reports
        Route::post('/reports', [ReportController::class, 'store']);

        // Reference checks (premium)
        Route::get('/reference-checks', [ReferenceCheckController::class, 'index']);
        Route::post('/reference-checks', [ReferenceCheckController::class, 'store']);

        // Verification reports (paid)
        Route::get('/verification-reports', [VerificationReportController::class, 'index']);
        Route::post('/verification-reports', [VerificationReportController::class, 'purchase']);
        Route::get('/verification-reports/{report}', [VerificationReportController::class, 'show'])->whereUuid('report');
    });

    /*
    | Helper routes
    */
    Route::middleware('user_type:helper')->group(function () {
        Route::get('/helpers/me', [HelperProfileController::class, 'show']);
        Route::put('/helpers/me', [HelperProfileController::class, 'update']);
        Route::post('/helpers/me/publish', [HelperProfileController::class, 'publishStatus']);
        Route::get('/helpers/me/verifications', [HelperProfileController::class, 'verifications']);
        Route::post('/helpers/me/verifications/{type}', [HelperProfileController::class, 'requestVerification'])
            ->whereIn('type', ['photo', 'nin', 'address']);

        // Applications & saved jobs
        Route::get('/helpers/applications', [HelperApplicationController::class, 'index']);
        Route::post('/jobs/{job}/apply', [HelperApplicationController::class, 'apply'])->whereUuid('job');
        Route::post('/helpers/applications/{application}/withdraw', [HelperApplicationController::class, 'withdraw'])->whereUuid('application');
        Route::get('/helpers/saved-jobs', [HelperApplicationController::class, 'savedJobs']);
        Route::post('/helpers/saved-jobs/{job}', [HelperApplicationController::class, 'saveJob'])->whereUuid('job');
        Route::delete('/helpers/saved-jobs/{job}', [HelperApplicationController::class, 'unsaveJob'])->whereUuid('job');

        // Interview responses
        Route::post('/interviews/{interview}/respond', [InterviewController::class, 'respond'])->whereUuid('interview');

        // Reports — respond
        Route::post('/reports/{report}/respond', [ReportController::class, 'respond'])->whereUuid('report');

        // Disputes
        Route::get('/disputes', [DisputeController::class, 'index']);
        Route::post('/disputes', [DisputeController::class, 'store']);
        Route::get('/disputes/{dispute}', [DisputeController::class, 'show'])->whereUuid('dispute');
    });

    // Shared participant views (reviews & reports)
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::get('/reviews/{review}', [ReviewController::class, 'show'])->whereUuid('review');
    Route::post('/reviews/{review}/respond', [ReviewController::class, 'respond'])->whereUuid('review');
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/reports/{report}', [ReportController::class, 'show'])->whereUuid('report');

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show'])->whereUuid('user');
        Route::patch('/users/{user}/status', [AdminUserController::class, 'suspend'])->whereUuid('user');
        Route::post('/users/{user}/roles', [AdminUserController::class, 'assignRole'])->whereUuid('user');
        Route::get('/roles', [AdminUserController::class, 'roles']);

        // Verification
        Route::get('/verifications', [AdminVerificationController::class, 'identityIndex']);
        Route::post('/verifications/{verification}/decide', [AdminVerificationController::class, 'identityDecide'])->whereUuid('verification');
        Route::get('/reference-checks', [AdminVerificationController::class, 'referenceIndex']);
        Route::post('/reference-checks/{check}/complete', [AdminVerificationController::class, 'referenceComplete'])->whereUuid('check');

        // Reports
        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::get('/reports/{report}', [AdminReportController::class, 'show'])->whereUuid('report');
        Route::post('/reports/{report}/decide', [AdminReportController::class, 'decide'])->whereUuid('report');

        // Reviews
        Route::get('/reviews', [AdminReviewController::class, 'index']);
        Route::post('/reviews/{review}/moderate', [AdminReviewController::class, 'moderate'])->whereUuid('review');

        // Disputes
        Route::get('/disputes', [AdminDisputeController::class, 'index']);
        Route::get('/disputes/{dispute}', [AdminDisputeController::class, 'show'])->whereUuid('dispute');
        Route::post('/disputes/{dispute}/decide', [AdminDisputeController::class, 'decide'])->whereUuid('dispute');

        // Jobs
        Route::get('/jobs', [AdminJobController::class, 'index']);
        Route::post('/jobs/{job}/moderate', [AdminJobController::class, 'moderate'])->whereUuid('job');

        // Payments
        Route::get('/payments', [AdminPaymentController::class, 'index']);
        Route::post('/payments/{payment}/refund', [AdminPaymentController::class, 'refund'])->whereUuid('payment');

        // Trust score
        Route::get('/trust-score/rules', [AdminTrustScoreController::class, 'rules']);
        Route::post('/trust-score/rules', [AdminTrustScoreController::class, 'storeRule']);
        Route::put('/trust-score/rules/{rule}', [AdminTrustScoreController::class, 'updateRule']);
        Route::post('/trust-score/recalculate', [AdminTrustScoreController::class, 'recalculateAll']);
        Route::post('/trust-score/helpers/{helper}/recalculate', [AdminTrustScoreController::class, 'recalculateOne'])->whereUuid('helper');
        Route::post('/trust-score/helpers/{helper}/adjust', [AdminTrustScoreController::class, 'manualAdjust'])->whereUuid('helper');
        Route::get('/trust-score/events', [AdminTrustScoreController::class, 'events']);

        // Audit logs
        Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);

        // Settings
        Route::get('/settings', [AdminSettingController::class, 'index']);
        Route::put('/settings', [AdminSettingController::class, 'update']);
    });
});
