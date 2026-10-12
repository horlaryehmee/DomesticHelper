#!/usr/bin/env bash
#
# Install the public_html router for the MAIN domain case, with the canonical
# domain substituted into the HTTPS redirect rule.
#
# cPanel pins the main domain's document root to public_html and will not move it,
# so this installs a front controller there that forwards every request into the
# Laravel public directory. Use this when the main domain IS the site and you do
# not want to ask the host to change a document root.
#
# Usage:
#   DOMAIN=example.com bash scripts/setup-public-html.sh
#   DOMAIN=example.com PUBLIC_HTML=~/public_html bash scripts/setup-public-html.sh
#
# Writes only public_html/.htaccess and public_html/index.php, and refuses to
# overwrite either when it does not already look like an install of this script.
set -euo pipefail

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "ERROR: set DOMAIN, e.g. DOMAIN=example.com bash scripts/setup-public-html.sh" >&2
  exit 2
fi

PUBLIC_HTML="${PUBLIC_HTML:-$HOME/public_html}"
[ -d "$PUBLIC_HTML" ] || { echo "ERROR: $PUBLIC_HTML not found" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/../cpanel/public_html.htaccess"

for f in "$PUBLIC_HTML/.htaccess" "$PUBLIC_HTML/index.php"; do
  if [ -f "$f" ] && ! grep -q "Hire Safe" "$f"; then
    echo "ERROR: $f exists and is not this installer's output; refusing to overwrite." >&2
    echo "       Back it up or remove it, then re-run." >&2
    exit 1
  fi
done

# Substitute the canonical domain used by the HTTPS redirect and by the
# X-Forwarded-Proto handling. The placeholder only appears in .htaccess.
sed "s/YOURDOMAIN/$DOMAIN/g" "$SRC" > "$PUBLIC_HTML/.htaccess"
cp "$SCRIPT_DIR/../cpanel/public_html.index.php" "$PUBLIC_HTML/index.php"

chmod 644 "$PUBLIC_HTML/.htaccess" "$PUBLIC_HTML/index.php" 2>/dev/null || true

echo ">> Installed public_html router for $DOMAIN"
echo "   $PUBLIC_HTML/.htaccess"
echo "   $PUBLIC_HTML/index.php"
if grep -q "YOURDOMAIN" "$PUBLIC_HTML/.htaccess"; then
  echo "WARNING: YOURDOMAIN placeholder still present - check the substitution." >&2
  exit 1
fi
