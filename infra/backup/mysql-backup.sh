#!/usr/bin/env bash
# Daily MySQL backup for the PIG production database.
#
# Server install path:
#   /opt/pig/bin/mysql-backup.sh
#
# Cron:
#   0 3 * * * /opt/pig/bin/mysql-backup.sh >> /opt/pig/logs/mysql-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/pig/shared/backups}"
SECRETS="${SECRETS:-/home/ubuntu/.pig-secrets}"
DB_NAME="${DB_NAME:-pig}"
KEEP_DAYS="${KEEP_DAYS:-30}"
TS="$(date +%Y-%m-%d_%H-%M-%S)"
OUT="$BACKUP_DIR/${DB_NAME}-${TS}.sql.gz"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

read_secret() {
  local key="$1"
  grep "^${key}=" "$SECRETS" | head -1 | cut -d= -f2-
}

mkdir -p "$BACKUP_DIR"

if [ ! -r "$SECRETS" ]; then
  log "ERROR cannot read $SECRETS" >&2
  exit 1
fi

ROOT_PASS="$(read_secret MYSQL_ROOT_PASS)"
if [ -z "${ROOT_PASS:-}" ]; then
  log "ERROR $SECRETS is missing MYSQL_ROOT_PASS" >&2
  exit 2
fi

log "backup start -> $OUT"

MYSQL_PWD="$ROOT_PASS" mysqldump \
  -h 127.0.0.1 \
  -u root \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  --add-drop-table \
  "$DB_NAME" | gzip -9 > "$OUT"

gzip -t "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
log "backup complete: $SIZE"

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +"$KEEP_DAYS" -print -delete 2>/dev/null |
  while read -r file; do
    log "deleted expired backup: $file"
  done

COUNT="$(find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" | wc -l)"
TOTAL="$(du -sh "$BACKUP_DIR" | cut -f1)"
log "backup inventory: $COUNT files, total $TOTAL"
