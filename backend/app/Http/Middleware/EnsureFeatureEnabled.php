<?php

namespace App\Http\Middleware;

use App\Services\PlatformFeatures;
use Closure;
use Illuminate\Http\Request;

class EnsureFeatureEnabled
{
    public function handle(Request $request, Closure $next)
    {
        $path = '/'.preg_replace('#^api/?#', '', $request->path());
        abort_unless(app(PlatformFeatures::class)->allows($path), 404, 'Not found.');
        if ($path === '/admin/jobs' && $request->isMethod('POST')) {
            abort_unless(app(PlatformFeatures::class)->enabled('job_posting'), 404, 'Not found.');
        }

        return $next($request);
    }
}
