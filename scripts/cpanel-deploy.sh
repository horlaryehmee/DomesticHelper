#!/usr/bin/env bash
#
# Domestic Helper — cPanel deploy script.
# Run from the REPO ROOT on the server, after `git pull` + `composer install`.
#
#   cd ~/domestichelper.yourdomain.com
#   git pull origin main
#   php ~/composer.phar install --no-dev --optimize-autoloader --no-interaction
#   php backend/artisan migrate --force
#   bash scripts/cpanel-deploy.sh
#
# It installs the committed production SPA build (frontend/dist) into
# backend/public so the Laravel app serves the React app, then clears and
# warms all caches. Idempotent — safe to run after every deploy.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Native PHP binaries on Windows git-bash need C:/... paths, not /c/...
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) ROOT="$(cygpath -m "$ROOT")" ;;
esac
PUBLIC="$ROOT/backend/public"
DIST="$ROOT/frontend/dist"

if [ ! -d "$DIST" ] || [ ! -f "$DIST/index.html" ]; then
  echo "ERROR: frontend/dist is missing. Build it locally (npm run build) and commit it." >&2
  exit 1
fi

# 1. Install the SPA into the Laravel public dir.
#    - assets/ is cleared first so stale hashed bundles don't linger.
#    - Laravel's own files (index.php, .htaccess, robots.txt) are never touched.
echo ">> Installing SPA build into backend/public"
rm -rf "$PUBLIC/assets" "$PUBLIC/index.html"
cp -R "$DIST/." "$PUBLIC/"

# 2. Storage symlink (idempotent) for public profile images.
php "$ROOT/backend/artisan" storage:link >/dev/null 2>&1 || true

# 3. Migrations are run by the caller (needs --force) — but guard here:
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  php "$ROOT/backend/artisan" migrate --force
fi

# 4. Cache clear + warm.
#    IMPORTANT: config/route caching bakes APP_ENV in — never do it in a dev
#    environment (it poisons `php artisan test` and local .env changes).
APP_ENV_VALUE=$(grep -E '^APP_ENV=' "$ROOT/backend/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r\n' || true)
APP_ENV_VALUE=${APP_ENV_VALUE:-production}
echo ">> Clearing caches (APP_ENV=$APP_ENV_VALUE)"
php "$ROOT/backend/artisan" optimize:clear
if [ "$APP_ENV_VALUE" = "production" ]; then
  echo ">> Warming production caches"
  php "$ROOT/backend/artisan" config:cache
  php "$ROOT/backend/artisan" route:cache
  php "$ROOT/backend/artisan" view:cache
fi

echo ">> Deploy finished. SPA live at $PUBLIC/index.html"
