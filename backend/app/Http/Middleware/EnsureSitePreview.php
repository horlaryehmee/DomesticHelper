<?php

namespace App\Http\Middleware;

use App\Services\ComingSoon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSitePreview
{
    public function __construct(private ComingSoon $comingSoon) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->comingSoon->enabled()) {
            // These routes are public, so auth:sanctum has not selected the guard.
            // Resolve optional token/session authentication before checking admin access.
            $user = $request->user('sanctum');
            $isActiveAdmin = $user?->isAdmin() && $user->status->value === 'active';
            if (! $isActiveAdmin && ! $this->comingSoon->hasPreviewAccess($request->header('X-Site-Preview-Token'))) {
                abort(503, 'Site is coming soon.');
            }
        }

        return $next($request);
    }
}
