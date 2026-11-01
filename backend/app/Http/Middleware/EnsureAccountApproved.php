<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAccountApproved
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && ! $user->isAdmin()) {
            abort_unless($user->status->value === 'active', 403, 'This account is suspended.');
            if ($request->is('api/onboarding', 'api/onboarding/*')) {
                abort_unless($user->email_verified_at, 403, 'Verify your email before onboarding.');
            }
            $allowed = $request->is('api/auth/*', 'api/onboarding', 'api/onboarding/*', 'api/meta', 'api/site-status');
            abort_unless($allowed || $user->approval_status === 'approved', 403, 'Admin approval is required to access your dashboard.');
        }

        return $next($request);
    }
}
