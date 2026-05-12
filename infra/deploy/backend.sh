#!/usr/bin/env bash
# PIG 后端部署脚本(在服务器 ubuntu 用户身份下跑)
# 使用:
#   ssh pig 'bash -s' < infra/deploy/backend.sh
# 或先 scp 上去:
#   scp infra/deploy/backend.sh pig:/tmp/ && ssh pig 'bash /tmp/backend.sh'
#
# 前置条件(一次性):
# 1. GitHub Deploy keys 已加 ~/.ssh/github-deploy.pub
#    或用 HTTPS clone(GFW 干扰时重试 2-3 次)
# 2. /opt/pig/shared/.env.production 已就位 + WX_MP_APPID 等已填
# 3. MySQL pig 库 + pig_app 账户已建(由 W0 装环境时建好)

set -euo pipefail
trap 'echo "❌ FAILED at line $LINENO"; exit 1' ERR

REPO_HTTPS="https://github.com/W3217-SUDO/PIG-web.git"
REPO_SSH="git@github.com:W3217-SUDO/PIG-web.git"
BRANCH="${BRANCH:-main}"

TS=$(date +%Y%m%d-%H%M%S)
REL=/opt/pig/releases/$TS
LOG_DIR=/opt/pig/logs

mkdir -p "$REL" "$LOG_DIR"

echo "═══ 1/6 Clone 代码 ═══"
# 优先 SSH(快,无 GFW 干扰),失败回退 HTTPS + 重试
if ssh -o ConnectTimeout=5 -T -o BatchMode=yes git@github.com 2>&1 | grep -q "successfully authenticated"; then
  git clone --depth 1 -b "$BRANCH" "$REPO_SSH" "$REL"
else
  echo "  (SSH 不可用,回退 HTTPS, 大 buffer + 3 次重试)"
  for i in 1 2 3; do
    if git -c http.postBuffer=524288000 \
          -c http.lowSpeedLimit=0 -c http.lowSpeedTime=999999 \
          clone --depth 1 -b "$BRANCH" "$REPO_HTTPS" "$REL"; then
      break
    fi
    rm -rf "$REL"
    mkdir -p "$REL"
    [ "$i" = 3 ] && { echo "  ❌ HTTPS clone 3 次失败,加 Deploy key 到 GitHub"; exit 2; }
    sleep 3
  done
fi
echo "  ✓ release: $REL"

echo
echo "═══ 2/6 注入 .env.production(复制,不用软链, cluster mode 兼容)═══"
cp /opt/pig/shared/.env.production "$REL/backend/.env.production"
chmod 600 "$REL/backend/.env.production"

echo
echo "═══ 3/6 安装依赖(workspaces,根目录一次装全部)═══"
cd "$REL"
npm install --no-audit --no-fund --prefer-offline

echo
echo "═══ 4/6 backend build ═══"
cd "$REL/backend"
NODE_ENV=production npm run build
[ -f dist/main.js ] || { echo "❌ dist/main.js 不存在"; exit 3; }

echo
echo "═══ 5/6 跑 migration(增量) ═══"
NODE_ENV=production npm run migration:run

echo
echo "═══ 6/6 PM2 重启(fork 模式,cluster 与 NestJS ConfigModule 有 cwd 兼容问题)═══"
ln -sfn "$REL" /opt/pig/current
cd "$REL/backend"
pm2 delete pig-backend 2>/dev/null || true
NODE_ENV=production pm2 start dist/main.js \
  --name pig-backend \
  --cwd "$REL/backend" \
  --log "$LOG_DIR/pig-backend.log" \
  --time
pm2 save

echo
echo "═══ 验证 ═══"
sleep 3
curl -s -m 5 -w "\n  本机 :3000  → HTTP %{http_code}\n" http://127.0.0.1:3000/api/health | tail -2
curl -s -m 5 -w "  公网 nginx → HTTP %{http_code}\n" -o /dev/null https://www.rockingwei.online/api/health

echo
echo "✅ 部署完成: $REL"
echo "📜 最近 5 次 release:"
ls -dt /opt/pig/releases/*/ 2>/dev/null | head -5

echo
echo "🧹 清理 30 天前的旧 release(保留最近 5 次):"
ls -dt /opt/pig/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf 2>/dev/null
