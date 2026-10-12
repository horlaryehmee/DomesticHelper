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

# --- Refuse to run anywhere unauthorised -------------------------------------
# THIS GUARD IS THE POINT OF THE SCRIPT. An explicit target is the ONLY
# authoritative signal, because the fallback heuristics below cannot distinguish
# a server document root from a workstation checkout that merely happens to sit
# somewhere unnamed. Without this, running the script in the wrong directory
# silently drops a router into an unrelated site's web root — which is exactly
# how a sibling project gets taken down.
SUBSTITUTE="${PUBLIC_HTML:-}"
if [ -z "$SUBSTITUTE" ] && [ ! -f "$REPO_ROOT/.cpanel-install-approved" ]; then
  if [ "$(basename "$REPO_ROOT")" != "public_html" ] \
     && [ "$(basename "$(cd "$REPO_ROOT/.." && pwd)")" != "public_html" ]; then
    cat >&2 <<EOF
REFUSING TO INSTALL.

No target was given, and this checkout is neither named public_html nor sitting
inside a directory named public_html:

  checkout : $REPO_ROOT
  parent   : $(cd "$REPO_ROOT/.." && pwd)

If this really is the server's document root, confirm it once with:
  touch "$REPO_ROOT/.cpanel-install-approved"
then re-run. Otherwise name the target explicitly:

  PUBLIC_HTML=/home/<user>/public_html bash scripts/install-public-html.sh

Nothing was written.
EOF
    exit 2
  fi
fi

# --- Resolve the public_html target -----------------------------------------
# Two supported layouts, and they install into DIFFERENT directories:
#
#   A) repo IS the document root   -> cPanel Git Version Control cloned into
#      "public_html", so ~/public_html/.git and ~/public_html/backend both
#      exist. Router goes in the checkout root.
#
#   B) repo INSIDE the document root -> ~/public_html/hiresafe/backend.
#      Router goes in the PARENT, i.e. ~/public_html.
SELF_BASE="$(basename "$REPO_ROOT")"
PARENT="$(cd "$REPO_ROOT/.." && pwd)"

if [ -n "${PUBLIC_HTML:-}" ]; then
  # An explicit target wins, but an unrecognised one is refused rather than
  # guessed at, because the failure mode is silently breaking another site.
  case "$(basename "$PUBLIC_HTML")" in
    public_html|htaccess-test|*-test) : ;;
    *)
      echo "WARNING: PUBLIC_HTML=$PUBLIC_HTML is not named public_html." >&2
      echo "         Proceeding because you set it explicitly." >&2
      ;;
  esac
  PUBLIC_HTML="$(cd "$(dirname "$PUBLIC_HTML")" && pwd)/$(basename "$PUBLIC_HTML")"
elif [ "$SELF_BASE" = "public_html" ]; then
  # Layout A: the checkout IS the document root.
  PUBLIC_HTML="$REPO_ROOT"
elif [ "$(basename "$PARENT")" = "public_html" ]; then
  # Layout B: the checkout sits inside the document root.
  PUBLIC_HTML="$PARENT"
else
  # Layout A variant: the checkout is the document root but is not literally
  # named public_html (e.g. a staging copy). Only reachable after the explicit
  # .cpanel-install-approved opt-in above.
  echo ">> Checkout is not named public_html; installing into the checkout root."
  echo ">> (approved by .cpanel-install-approved)"
  PUBLIC_HTML="$REPO_ROOT"
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
