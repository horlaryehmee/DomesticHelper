<?php

/*
|--------------------------------------------------------------------------
| Hire Safe - main-domain front controller shim
|--------------------------------------------------------------------------
|
| cPanel keeps the MAIN domain's document root pinned to public_html and this
| file is what makes a Laravel app work from there anyway.
|
| public_html/.htaccess forwards every request here with the public-relative
| path stashed in myapp.request_uri, then this shim boots the real front
| controller in the checkout's public directory. Laravel therefore behaves
| exactly as if the document root were backend/public: it generates
| /storage/..., /assets/... and /api/... URLs with no /public segment, and
| Request::is('api/*'), route() and url() all work normally.
|
| Do not add application code here. It only exists to bridge the two paths.
|
*/

$public = __DIR__.'/backend/public';

if (! is_file($public.'/index.php')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Hire Safe is not deployed yet.\n\n";
    echo "The application front controller was not found at:\n";
    echo "  {$public}/index.php\n\n";
    echo "Clone the repository into this directory (see README) and run:\n";
    echo "  composer --working-dir=backend install --no-dev --optimize-autoloader\n";
    exit;
}

// Forward the real client IP so rate limiting and audit logs see the visitor,
// not the host's proxy.
if (empty($_SERVER['REMOTE_ADDR']) && ! empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $_SERVER['REMOTE_ADDR'] = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
}

require $public.'/index.php';
