#!/usr/bin/env bash
#
# Hire Safe cPanel deploy script.
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
#    - Laravel's own files (index.php, robots.txt) are never touched.
#    - public/.htaccess IS refreshed: the stock Laravel stub has no
#      proxy/TLS detection and no myapp.request_uri normalisation, and it is
#      gitignored, so a fresh clone would ship a broken one.
echo ">> Installing SPA build into backend/public"
rm -rf "$PUBLIC/assets" "$PUBLIC/index.html"
cp -R "$DIST/." "$PUBLIC/"
cp "$ROOT/cpanel/backend-public.htaccess" "$PUBLIC/.htaccess"

# 1c. Main-domain (public_html) front controller. No-op when the document root
#     already points at backend/public.
#
#     NOTE: Composer's generated autoloader is fully portable — every path in
#     vendor/composer/*.php is __DIR__-relative with no absolute prefix — so it
#     does NOT need regenerating after the checkout moves to its final location.
#     Do not "fix" it by deleting autoload_static.php: with
#     --optimize-autoloader, autoload_real.php hard-requires that file and every
#     request 500s until composer regenerates it.
if [ -f "$ROOT/cpanel/public_html.htaccess" ]; then
  PARENT_DIR="$(dirname "$ROOT")"
  # Only touch a parent that is genuinely this site's public_html.
  if [ "$(basename "$PARENT_DIR")" = "public_html" ] || [ -f "$PARENT_DIR/.cpanel.yml" ]; then
    echo ">> Ensuring public_html router files are current"
    cp "$ROOT/cpanel/public_html.htaccess" "$PARENT_DIR/.htaccess"
    cp "$ROOT/cpanel/public_html.index.php" "$PARENT_DIR/index.php"
  else
    echo ">> Parent is not public_html — skipping router install (run scripts/install-public-html.sh explicitly)"
  fi
fi

# 2. Storage symlink (idempotent) for public profile images.
php "$ROOT/backend/artisan" storage:link >/dev/null 2>&1 || true

# 3. Apply database changes before seeders or cache warming. Laravel only
#    runs migrations that have not already run, so this stays idempotent.
echo ">> Running database migrations"
php "$ROOT/backend/artisan" migrate --force

# The platform-owned Community Stories sources are idempotent and must exist
# even when a production database was created before the feature was added.
php "$ROOT/backend/artisan" db:seed --class=CommunityExperienceSeeder --force

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
