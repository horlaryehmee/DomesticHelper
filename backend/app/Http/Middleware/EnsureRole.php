<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user, 401);
        abort_unless($user->hasAnyRole($roles), 403, 'You do not have permission to perform this action.');

        return $next($request);
    }
}
