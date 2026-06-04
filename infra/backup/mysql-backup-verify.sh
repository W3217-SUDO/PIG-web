#!/usr/bin/env bash
# Verify the latest PIG MySQL backup.
#
# Default mode is read-only:
#   /opt/pig/bin/mysql-backup-verify.sh
#
# Strong restore check:
#   RESTORE_CHECK=1 /opt/pig/bin/mysql-backup-verify.sh
#
# The restore check imports into a temporary database and drops it afterwards.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/pig/shared/backups}"
SECRETS="${SECRETS:-/home/ubuntu/.pig-secrets}"
DB_NAME="${DB_NAME:-pig}"
BACKUP_FILE="${BACKUP_FILE:-}"
RESTORE_CHECK="${RESTORE_CHECK:-0}"

REQUIRED_TABLES=(
  user
  farmer
  pig
  address
  wallet
  wallet_transaction
  order
  order_payment
  share_invite
  message
  feeding_record
  health_record
)

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

read_secret() {
  local key="$1"
  grep "^${key}=" "$SECRETS" | head -1 | cut -d= -f2-
}

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(ls -1t "$BACKUP_DIR"/${DB_NAME}-*.sql.gz 2>/dev/null | head -1 || true)"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR backup file not found"
  exit 1
fi

log "verify backup: $BACKUP_FILE"

gzip -t "$BACKUP_FILE"
log "gzip integrity ok"

SQL_TMP="$(mktemp)"
trap 'rm -f "$SQL_TMP"; if [ -n "${RESTORE_DB:-}" ]; then MYSQL_PWD="${ROOT_PASS:-}" mysql -h 127.0.0.1 -u root -e "DROP DATABASE IF EXISTS \`$RESTORE_DB\`" >/dev/null 2>&1 || true; fi' EXIT

zcat "$BACKUP_FILE" > "$SQL_TMP"
BYTES="$(wc -c < "$SQL_TMP")"
if [ "$BYTES" -lt 1024 ]; then
  log "ERROR backup SQL is too small: $BYTES bytes"
  exit 2
fi
log "SQL payload size ok: $BYTES bytes"

for table in "${REQUIRED_TABLES[@]}"; do
  if grep -Eq "CREATE TABLE \`${table}\`|CREATE TABLE ${table}" "$SQL_TMP"; then
    log "table present: $table"
  else
    log "ERROR missing table in backup: $table"
    exit 3
  fi
done

if grep -q 'Dump completed' "$SQL_TMP"; then
  log "dump completion marker present"
else
  log "WARN dump completion marker not found"
fi

if [ "$RESTORE_CHECK" != "1" ]; then
  log "read-only backup verification passed"
  exit 0
fi

if [ ! -r "$SECRETS" ]; then
  log "ERROR cannot read $SECRETS"
  exit 4
fi

ROOT_PASS="$(read_secret MYSQL_ROOT_PASS)"
if [ -z "${ROOT_PASS:-}" ]; then
  log "ERROR $SECRETS is missing MYSQL_ROOT_PASS"
  exit 5
fi

RESTORE_DB="${DB_NAME}_restore_check_$(date +%Y%m%d%H%M%S)"
log "restore check database: $RESTORE_DB"

MYSQL_PWD="$ROOT_PASS" mysql -h 127.0.0.1 -u root -e "CREATE DATABASE \`$RESTORE_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
MYSQL_PWD="$ROOT_PASS" mysql -h 127.0.0.1 -u root "$RESTORE_DB" < "$SQL_TMP"

for table in user farmer pig order wallet message; do
  COUNT="$(MYSQL_PWD="$ROOT_PASS" mysql -N -B -h 127.0.0.1 -u root "$RESTORE_DB" -e "SELECT COUNT(*) FROM \`$table\`")"
  log "restore table count: $table=$COUNT"
done

MYSQL_PWD="$ROOT_PASS" mysql -h 127.0.0.1 -u root -e "DROP DATABASE \`$RESTORE_DB\`"
RESTORE_DB=""
log "restore verification passed"
