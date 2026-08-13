<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserType
{
    public function handle(Request $request, Closure $next, string ...$types): Response
    {
        $user = $request->user();

        abort_unless($user, 401);
        abort_unless(in_array($user->user_type->value, $types, true), 403, 'This area is not available for your account type.');

        return $next($request);
    }
}
