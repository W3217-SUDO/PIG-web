#!/usr/bin/env bash
# PIG H5 部署脚本(在本地 Windows / Mac / Linux 跑, 把 build 产物推到服务器)
#
# 使用:
#   bash infra/deploy/h5.sh
#
# 步骤:
# 1. 本地 build (frontend/.env.production 已配 https://www.rockingwei.online/api)
# 2. scp 到服务器 /tmp/pig-h5-new/
# 3. 服务器侧:备份当前 + 替换 /var/www/html/pig/

set -euo pipefail
trap 'echo "❌ FAILED at line $LINENO"; exit 1' ERR

cd "$(dirname "$0")/../.."   # 回到仓库根
echo "═══ 1/3 本地 H5 build ═══"
[ -f frontend/.env.production ] || { echo "❌ frontend/.env.production 不存在,先建并填 VITE_API_BASE"; exit 1; }
npm run build:client:h5
[ -d frontend/dist/build/h5 ] || { echo "❌ build 产物缺失"; exit 2; }
ls frontend/dist/build/h5/ | head -5
du -sh frontend/dist/build/h5/

echo
echo "═══ 2/3 scp 到服务器 /tmp/pig-h5-new/ ═══"
ssh pig 'rm -rf /tmp/pig-h5-new && mkdir /tmp/pig-h5-new'
scp -r -q frontend/dist/build/h5/* pig:/tmp/pig-h5-new/

echo
echo "═══ 3/3 服务器侧:备份当前 → 替换 /var/www/html/pig/ ═══"
ssh pig 'sudo bash -s' << 'BASH'
set -e
TS=$(date +%Y%m%d-%H%M%S)
BACKUP=/var/www/html/pig-h5-bak-$TS

if [ -d /var/www/html/pig ]; then
  cp -r /var/www/html/pig "$BACKUP"
  echo "  ✓ 已备份至 $BACKUP"
fi

rm -rf /var/www/html/pig/*
cp -r /tmp/pig-h5-new/* /var/www/html/pig/
chown -R www-data:www-data /var/www/html/pig
echo "  ✓ 新 H5 已就位"
ls /var/www/html/pig/ | head -5

# 自动清理 30 天前备份(保留 7 份)
ls -dt /var/www/html/pig-h5-bak-*/ 2>/dev/null | tail -n +8 | xargs -r rm -rf 2>/dev/null || true
BASH

echo
echo "═══ 验证 ═══"
ssh pig 'curl -s -o /dev/null -w "  https://www.rockingwei.online/ → HTTP %{http_code}\n" https://www.rockingwei.online/'
echo "✅ H5 部署完成"
