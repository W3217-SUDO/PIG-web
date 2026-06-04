#!/usr/bin/env bash
# PIG H5 deployment script for local/manual deployment.
#
# Usage:
#   bash infra/deploy/h5.sh

set -euo pipefail
trap 'echo "FAILED at line $LINENO"; exit 1' ERR

cd "$(dirname "$0")/../.."

GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo manual)"

echo "== 1/4 Build H5 =="
VITE_API_BASE="${VITE_API_BASE:-https://www.rockingwei.online/api}" npm run build:client:h5
test -f frontend/dist/build/h5/index.html
test -d frontend/dist/build/h5/assets
grep -q '<div id="app"' frontend/dist/build/h5/index.html
tar czf /tmp/pig-h5.tar.gz -C frontend/dist/build/h5 .
du -sh /tmp/pig-h5.tar.gz

echo
echo "== 2/4 Upload artifact =="
scp -q /tmp/pig-h5.tar.gz pig:/tmp/pig-h5.tar.gz

echo
echo "== 3/4 Publish on server =="
ssh pig "sudo -n GIT_COMMIT=$GIT_COMMIT bash -s" <<'REMOTE'
set -euo pipefail
SITE_DIR=/var/www/html/pig
TS=$(date +%Y%m%d_%H%M%S)
BACKUP=/var/www/html/pig-h5-bak-$TS
STAGING=/tmp/pig-h5-$TS

mkdir -p "$STAGING"
tar xzf /tmp/pig-h5.tar.gz -C "$STAGING"
test -f "$STAGING/index.html"
test -d "$STAGING/assets"

if [ -d "$SITE_DIR" ]; then
  cp -a "$SITE_DIR" "$BACKUP"
  echo "  backup: $BACKUP"
fi

mkdir -p "$SITE_DIR"
find "$SITE_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$STAGING"/. "$SITE_DIR"/
printf '%s\n' "$GIT_COMMIT" > "$SITE_DIR/release.txt"
chown -R www-data:www-data "$SITE_DIR"
rm -rf "$STAGING" /tmp/pig-h5.tar.gz

curl -fsS --resolve www.rockingwei.online:443:127.0.0.1 https://www.rockingwei.online/ | grep -q '<div id="app"'
test "$(cat "$SITE_DIR/release.txt")" = "$GIT_COMMIT"
ls -dt /var/www/html/pig-h5-bak-*/ 2>/dev/null | tail -n +8 | xargs -r rm -rf
REMOTE

echo
echo "== 4/4 Verify =="
ssh pig "cat /var/www/html/pig/release.txt && curl -fsS --resolve www.rockingwei.online:443:127.0.0.1 https://www.rockingwei.online/ | head -c 120"
echo
echo "H5 deployment complete: $GIT_COMMIT"
