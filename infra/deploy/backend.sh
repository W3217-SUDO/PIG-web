#!/usr/bin/env bash
# PIG backend deployment script for the ubuntu user on the server.
#
# Usage:
#   ssh pig 'bash -s' < infra/deploy/backend.sh
#   BRANCH=dev ssh pig 'bash -s' < infra/deploy/backend.sh

set -euo pipefail
trap 'echo "FAILED at line $LINENO"; exit 1' ERR

REPO_HTTPS="https://github.com/W3217-SUDO/PIG-web.git"
REPO_SSH="git@github.com:W3217-SUDO/PIG-web.git"
BRANCH="${BRANCH:-main}"

TS=$(date +%Y%m%d-%H%M%S)
REL="/opt/pig/releases/$TS"
LOG_DIR="/opt/pig/logs"

mkdir -p "$REL" "$LOG_DIR"

echo "== 1/6 Clone code =="
if ssh -o ConnectTimeout=5 -T -o BatchMode=yes git@github.com 2>&1 | grep -q "successfully authenticated"; then
  git clone --depth 1 -b "$BRANCH" "$REPO_SSH" "$REL"
else
  echo "  SSH clone unavailable, fallback to HTTPS with retries"
  for i in 1 2 3; do
    if git -c http.postBuffer=524288000 \
      -c http.lowSpeedLimit=0 -c http.lowSpeedTime=999999 \
      clone --depth 1 -b "$BRANCH" "$REPO_HTTPS" "$REL"; then
      break
    fi
    rm -rf "$REL"
    mkdir -p "$REL"
    [ "$i" = 3 ] && { echo "HTTPS clone failed 3 times. Add a Deploy key to GitHub."; exit 2; }
    sleep 3
  done
fi

GIT_COMMIT="$(git -C "$REL" rev-parse HEAD 2>/dev/null || echo unknown)"
echo "  release: $REL"
echo "  commit: $GIT_COMMIT"

echo
echo "== 2/6 Inject production env =="
cp /opt/pig/shared/.env.production "$REL/backend/.env.production"
chmod 600 "$REL/backend/.env.production"

echo
echo "== 3/6 Install dependencies =="
cd "$REL"
npm install --no-audit --no-fund --prefer-offline

echo
echo "== 4/6 Build backend =="
cd "$REL/backend"
rm -rf dist tsconfig.tsbuildinfo
NODE_ENV=production npm run build
[ -f dist/main.js ] || { echo "dist/main.js does not exist"; exit 3; }

echo
echo "== 5/6 Run migrations =="
NODE_ENV=production npm run migration:run

echo
echo "== 6/6 Restart PM2 =="
ln -sfn "$REL" /opt/pig/current
sudo install -m 644 -o root -g root "$REL/infra/deploy/logrotate-pig.conf" /etc/logrotate.d/pig
sudo logrotate -d /etc/logrotate.d/pig >/dev/null
cd /opt/pig/current/backend
pm2 delete pig-backend 2>/dev/null || true
NODE_ENV=production GIT_COMMIT="$GIT_COMMIT" PM2_INSTANCES="${PM2_INSTANCES:-2}" \
  pm2 start /opt/pig/current/infra/deploy/ecosystem.config.cjs --update-env
pm2 save

echo
echo "== Verify =="
sleep 3
HEALTH_JSON=$(curl -fsS http://127.0.0.1:3000/api/health)
HEALTH_JSON="$HEALTH_JSON" GIT_COMMIT="$GIT_COMMIT" node -e "const h=JSON.parse(process.env.HEALTH_JSON).data; if(h.commit!==process.env.GIT_COMMIT){console.error('health commit mismatch', h.commit, process.env.GIT_COMMIT); process.exit(1)} if(h.system?.backup?.status!=='ok'){console.error('backup health not ok', h.system?.backup); process.exit(1)}"
echo "$HEALTH_JSON" | head -c 300
printf "\n"
curl -s -m 5 -w "public nginx -> HTTP %{http_code}\n" -o /dev/null https://www.rockingwei.online/api/health || true

echo
echo "Deployment complete: $REL"
echo "Recent releases:"
ls -dt /opt/pig/releases/*/ 2>/dev/null | head -5

echo
echo "Cleanup old releases, keeping the latest 5"
ls -dt /opt/pig/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf 2>/dev/null
