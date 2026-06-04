#!/usr/bin/env bash
set -u

ENV_FILE="${ENV_FILE:-/opt/pig/shared/.env.production}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
PM2_APP_NAME="${PM2_APP_NAME:-pig-backend}"
PM2_RESTART_THRESHOLD="${PM2_RESTART_THRESHOLD:-3}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  printf '%s [pig-health-alert] %s\n' "$(date -Iseconds)" "$*"
}

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
  fi
}

append_failures() {
  local file="$1"
  while IFS= read -r line; do
    [ -n "$line" ] && failures+=("$line")
  done < "$file"
}

send_alert() {
  local message="$1"

  if [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
    log "WARN no ALERT_WEBHOOK_URL configured; alert not sent"
    return 0
  fi

  ALERT_MESSAGE="$message" ALERT_WEBHOOK_URL="$ALERT_WEBHOOK_URL" node <<'NODE' > "$TMP_DIR/payload.json"
const url = process.env.ALERT_WEBHOOK_URL || "";
const message = process.env.ALERT_MESSAGE || "";

if (url.includes("qyapi.weixin.qq.com")) {
  process.stdout.write(JSON.stringify({
    msgtype: "markdown",
    markdown: { content: message.replace(/\n/g, "\n> ") },
  }));
} else {
  process.stdout.write(JSON.stringify({
    msgtype: "text",
    text: { content: message },
  }));
}
NODE

  if curl -fsS --max-time 10 \
    -H 'Content-Type: application/json' \
    -d @"$TMP_DIR/payload.json" \
    "$ALERT_WEBHOOK_URL" >/dev/null 2>"$TMP_DIR/alert.err"; then
    log "alert sent"
  else
    log "WARN alert send failed: $(tr '\n' ' ' < "$TMP_DIR/alert.err" | head -c 240)"
  fi
}

check_health() {
  local curl_err="$TMP_DIR/health-curl.err"
  local parse_err="$TMP_DIR/health-parse.err"
  local health_json

  if ! health_json="$(curl -fsS --max-time 10 "$HEALTH_URL" 2>"$curl_err")"; then
    failures+=("health request failed: $(tr '\n' ' ' < "$curl_err" | head -c 240)")
    return
  fi

  HEALTH_JSON="$health_json" node <<'NODE' 2>"$parse_err"
const payload = JSON.parse(process.env.HEALTH_JSON || "{}");
const data = payload.data || {};
const system = data.system || {};
const failures = [];

if (data.status !== "ok") failures.push(`health status=${data.status || "missing"}`);
if (data.db !== "ok") failures.push(`db=${data.db || "missing"}`);
if (data.redis !== "ok") failures.push(`redis=${data.redis || "missing"}`);
if ((system.backup || {}).status !== "ok") {
  failures.push(`backup=${(system.backup || {}).status || "missing"}`);
}
if ((system.disk || {}).status !== "ok") {
  failures.push(`disk=${(system.disk || {}).status || "missing"}`);
}
if (!data.commit || data.commit === "dev" || data.commit === "unknown") {
  failures.push(`commit=${data.commit || "missing"}`);
}

if (failures.length > 0) {
  for (const item of failures) console.error(item);
  process.exit(2);
}
NODE

  if [ "$?" -ne 0 ]; then
    append_failures "$parse_err"
  fi
}

check_pm2() {
  local pm2_err="$TMP_DIR/pm2.err"
  local pm2_parse="$TMP_DIR/pm2-parse.err"
  local pm2_json

  if ! command -v pm2 >/dev/null 2>&1; then
    failures+=("pm2 command missing")
    return
  fi

  if ! pm2_json="$(pm2 jlist 2>"$pm2_err")"; then
    failures+=("pm2 jlist failed: $(tr '\n' ' ' < "$pm2_err" | head -c 240)")
    return
  fi

  PM2_JSON="$pm2_json" PM2_APP_NAME="$PM2_APP_NAME" PM2_RESTART_THRESHOLD="$PM2_RESTART_THRESHOLD" node <<'NODE' 2>"$pm2_parse"
const list = JSON.parse(process.env.PM2_JSON || "[]");
const appName = process.env.PM2_APP_NAME || "pig-backend";
const threshold = Number(process.env.PM2_RESTART_THRESHOLD || 3);
const apps = list.filter((item) => item.name === appName);
const failures = [];

if (apps.length === 0) {
  failures.push(`pm2 app ${appName} missing`);
}

for (const app of apps) {
  const status = app.pm2_env?.status;
  const restarts = Number(app.pm2_env?.restart_time || 0);
  if (status !== "online") {
    failures.push(`pm2 ${appName}#${app.pm_id} status=${status || "missing"}`);
  }
  if (restarts > threshold) {
    failures.push(`pm2 ${appName}#${app.pm_id} restarts=${restarts} threshold=${threshold}`);
  }
}

if (failures.length > 0) {
  for (const item of failures) console.error(item);
  process.exit(2);
}
NODE

  if [ "$?" -ne 0 ]; then
    append_failures "$pm2_parse"
  fi
}

main() {
  load_env
  failures=()

  check_health
  check_pm2

  if [ "${#failures[@]}" -eq 0 ]; then
    log "OK health/db/redis/disk/backup/pm2 checks passed"
    return 0
  fi

  local host
  host="$(hostname 2>/dev/null || echo unknown-host)"

  local message
  message="PIG production alert
host: $host
time: $(date -Iseconds)
url: $HEALTH_URL

$(printf -- '- %s\n' "${failures[@]}")"

  log "FAIL $(printf '%s; ' "${failures[@]}" | head -c 500)"
  send_alert "$message"
  return 1
}

main "$@"
