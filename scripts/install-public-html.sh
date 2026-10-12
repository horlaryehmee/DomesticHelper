#!/usr/bin/env bash
#
# Hire Safe — install the main-domain (public_html) front controller.
#
# WHY THIS EXISTS
#   cPanel pins the MAIN domain's document root to public_html. A Laravel +
#   React monorepo wants the document root at <checkout>/backend/public. This
#   script bridges the two without asking the host to move anything:
#
#     public_html/.htaccess   routes every request into public/index.php and
#                             stashes the public-relative path in
#                             myapp.request_uri
#     public_html/index.php   shim that requires backend/public/index.php
#     public_html/backend/    the checkout (created by `git clone` in cPanel)
#
#   The result behaves exactly like a real document root: clean URLs
#   (/storage/..., /assets/..., /api/...) with no /public segment.
#
# USAGE — run from the checkout root, ON THE SERVER:
#
#   cd ~/public_html
#   bash scripts/install-public-html.sh
#
#   The target defaults to the checkout's parent directory, but is only
#   accepted when it is named public_html. Override explicitly for any other
#   layout (a staging copy, a subdomain document root, a local test):
#
#   PUBLIC_HTML=/home/hiresafe/public_html       bash scripts/install-public-html.sh
#   PUBLIC_HTML="$HOME/tmp/htaccess-test"        bash scripts/install-public-html.sh
#
# Safe to re-run: it overwrites only the router files and never touches
# backend/.env, storage, or anything a deploy generated.

set -euo pipefail

# --- Locate the checkout -----------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Native PHP on Windows git-bash needs C:/... paths rather than /c/...
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) REPO_ROOT="$(cygpath -m "$REPO_ROOT")" ;;
esac

PUBLIC_DIR="$REPO_ROOT/backend/public"

# --- Resolve the public_html target -----------------------------------------
# NEVER guess from an unverified parent: on a workstation the parent directory
# holds unrelated projects and writing router files there would break them.
PARENT="$(cd "$REPO_ROOT/.." && pwd)"

if [ -n "${PUBLIC_HTML:-}" ]; then
  PUBLIC_HTML="$(cd "$(dirname "$PUBLIC_HTML")" && pwd)/$(basename "$PUBLIC_HTML")"
elif [ "$(basename "$PARENT")" = "public_html" ]; then
  PUBLIC_HTML="$PARENT"
else
  cat >&2 <<EOF
ERROR: cannot determine the public_html target.

The checkout lives at:
  $REPO_ROOT
and its parent, "$(basename "$PARENT")", is not named public_html — this is
probably a development machine, not the server.

Pass the target explicitly, for example:
  PUBLIC_HTML=/home/hiresafe/public_html bash scripts/install-public-html.sh

To rehearse the install locally without touching anything permanent:
  PUBLIC_HTML="\$HOME/.hiresafe-htaccess-test" bash scripts/install-public-html.sh
EOF
  exit 2
fi

echo ">> Checkout root  : $REPO_ROOT"
echo ">> public_html    : $PUBLIC_HTML"

# --- Preconditions -----------------------------------------------------------
if [ ! -f "$PUBLIC_DIR/index.php" ]; then
  echo "ERROR: $PUBLIC_DIR/index.php not found. Is this a Hire Safe checkout?" >&2
  exit 1
fi

if [ ! -d "$PUBLIC_HTML" ]; then
  echo ">> Creating target directory $PUBLIC_HTML"
  mkdir -p "$PUBLIC_HTML"
fi

if [ ! -w "$PUBLIC_HTML" ]; then
  echo "ERROR: $PUBLIC_HTML is not writable. Run this as the owning account." >&2
  exit 1
fi

# Refuse to clobber an unrelated app's front controller.
for f in "$PUBLIC_HTML/.htaccess" "$PUBLIC_HTML/index.php"; do
  if [ -f "$f" ] && ! grep -q "Hire Safe" "$f" 2>/dev/null; then
    echo "ERROR: $f exists and does not look like a Hire Safe file." >&2
    echo "       Inspect it before overwriting — it may belong to another app." >&2
    exit 1
  fi
done

# --- 1. Router files ---------------------------------------------------------
echo ">> Installing public_html/.htaccess"
cp "$REPO_ROOT/cpanel/public_html.htaccess" "$PUBLIC_HTML/.htaccess"

echo ">> Installing public_html/index.php"
cp "$REPO_ROOT/cpanel/public_html.index.php" "$PUBLIC_HTML/index.php"

echo ">> Installing backend/public/.htaccess"
cp "$REPO_ROOT/cpanel/backend-public.htaccess" "$PUBLIC_DIR/.htaccess"

# --- 2. Checkout-root deny list ---------------------------------------------
# Only meaningful when the checkout is a DIRECT child of public_html. Placed as
# `.htaccess.checkout` rather than `.htaccess` so it can never shadow the
# router above; rename it to .htaccess only for a subdomain whose document root
# points straight at the checkout.
if [ "$PUBLIC_HTML" = "$PARENT" ]; then
  echo ">> Installing checkout-root deny list (inactive: .htaccess.checkout)"
  cp "$REPO_ROOT/cpanel/checkout-root.htaccess" "$PUBLIC_HTML/.htaccess.checkout"
  echo "   Inactive by design; public_html/.htaccess already blocks ^backend."
else
  echo ">> Checkout is not a direct child of the target — skipping checkout-root deny"
fi

# --- 3. Permissions ----------------------------------------------------------
# Directories 755 (LiteSpeed must traverse them), files 644.
echo ">> Fixing permissions"
chmod 755 "$PUBLIC_HTML" 2>/dev/null || true
chmod 644 "$PUBLIC_HTML/.htaccess" "$PUBLIC_HTML/index.php" 2>/dev/null || true
chmod 644 "$PUBLIC_DIR/.htaccess" 2>/dev/null || true
chmod 755 "$REPO_ROOT" "$REPO_ROOT/backend" "$PUBLIC_DIR" 2>/dev/null || true
chmod -R 755 "$REPO_ROOT/backend/storage" "$REPO_ROOT/backend/bootstrap/cache" 2>/dev/null || true

# --- 4. Verify ---------------------------------------------------------------
echo ">> Verifying install"
ok=0
for f in "$PUBLIC_HTML/.htaccess" "$PUBLIC_HTML/index.php" "$PUBLIC_DIR/.htaccess" "$PUBLIC_DIR/index.php"; do
  if [ -f "$f" ]; then
    echo "   present: $f"
  else
    echo "   MISSING: $f" >&2
    ok=1
  fi
done

if [ ! -f "$REPO_ROOT/backend/vendor/autoload.php" ]; then
  echo "   WARNING: backend/vendor/autoload.php is missing — run:"
  echo "            composer --working-dir=backend install --no-dev --optimize-autoloader"
fi

if [ ! -f "$REPO_ROOT/backend/.env" ]; then
  echo "   WARNING: backend/.env is missing — copy .env.example and set APP_URL, DB_* and keys."
fi

[ "$ok" -eq 0 ] || exit 1

echo ">> Done. The site is now served from $PUBLIC_DIR via the router in $PUBLIC_HTML"
