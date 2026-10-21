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
        if ($this->comingSoon->enabled()
            && ! $request->user()?->isAdmin()
            && ! $this->comingSoon->hasPreviewAccess($request->header('X-Site-Preview-Token'))) {
            abort(503, 'Site is coming soon.');
        }

        return $next($request);
    }
}
