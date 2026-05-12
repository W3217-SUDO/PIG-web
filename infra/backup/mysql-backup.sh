#!/usr/bin/env bash
# MySQL 每日备份脚本
# 部署位置: 服务器 /opt/pig/bin/mysql-backup.sh
# 安装到 cron:
#   crontab -e (ubuntu 用户)
#   0 3 * * * /opt/pig/bin/mysql-backup.sh >> /opt/pig/logs/mysql-backup.log 2>&1
#
# 行为:
#   1. mysqldump pig 数据库到 /opt/pig/shared/backups/pig-YYYY-MM-DD.sql.gz
#   2. 保留最近 30 份, 老的自动清
#   3. 写日志到 stderr (cron 把它送进 mysql-backup.log)

set -euo pipefail

BACKUP_DIR=/opt/pig/shared/backups
SECRETS=/home/ubuntu/.pig-secrets
KEEP_DAYS=30
TS=$(date +%Y-%m-%d_%H-%M-%S)
OUT="$BACKUP_DIR/pig-${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"

# 从 ~/.pig-secrets 读 MYSQL_ROOT_PASS
if [ ! -r "$SECRETS" ]; then
  echo "[$(date -Iseconds)] ❌ 无法读 $SECRETS" >&2
  exit 1
fi
ROOT_PASS=$(grep "^MYSQL_ROOT_PASS=" "$SECRETS" | head -1 | cut -d= -f2-)

if [ -z "${ROOT_PASS:-}" ]; then
  echo "[$(date -Iseconds)] ❌ ~/.pig-secrets 缺 MYSQL_ROOT_PASS" >&2
  exit 2
fi

echo "[$(date -Iseconds)] 开始备份 → $OUT"

# mysqldump · single-transaction 不锁表
mysqldump \
  -h 127.0.0.1 -u root -p"$ROOT_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  --add-drop-table \
  pig | gzip -9 > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "[$(date -Iseconds)] ✅ 完成: $SIZE"

# 清理 30 天前
find "$BACKUP_DIR" -name "pig-*.sql.gz" -mtime +$KEEP_DAYS -print -delete 2>/dev/null | \
  while read f; do echo "[$(date -Iseconds)] 🗑 清理过期: $f"; done

# 当前备份总数 + 总占用
COUNT=$(find "$BACKUP_DIR" -name "pig-*.sql.gz" | wc -l)
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date -Iseconds)] 当前 $COUNT 份备份, 总占 $TOTAL"
