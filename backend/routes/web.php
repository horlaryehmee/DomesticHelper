<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA entry — production
|--------------------------------------------------------------------------
| In production the built React app lives in public/build (or public/).
| All non-API routes fall through to the SPA so client-side routing works.
*/

Route::get('/api/auth/google/redirect', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'redirect'])->middleware('throttle:auth');
Route::get('/api/auth/google/callback', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'callback'])->middleware('throttle:auth');

Route::get('/{any?}', function () {
    $build = public_path('build/index.html');
    $root = public_path('index.html');

    if (file_exists($build)) {
        return response()->file($build);
    }
    if (file_exists($root)) {
        return response()->file($root);
    }

    return response()->json([
        'app' => 'Hire Safe API',
        'status' => 'ok',
        'docs' => 'The API lives under /api. The React frontend runs at '.(string) config('app.frontend_url').' in development.',
    ]);
})->where('any', '^(?!api|storage).*$');
