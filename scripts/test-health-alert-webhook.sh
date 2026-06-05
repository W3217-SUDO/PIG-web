#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ALERT_SCRIPT="$ROOT_DIR/infra/monitor/pig-health-alert.sh"

PASS=0
FAIL=0

ok() {
  printf "PASS %s\n" "$1"
  PASS=$((PASS + 1))
}

not_ok() {
  printf "FAIL %s\n" "$1"
  FAIL=$((FAIL + 1))
}

payload_for() {
  local url="$1"
  ALERT_WEBHOOK_URL="$url" ALERT_MESSAGE=$'PIG alert\n- db=fail' \
    bash "$ALERT_SCRIPT" --render-alert-payload
}

assert_payload() {
  local label="$1"
  local url="$2"
  local check="$3"
  local payload

  if ! payload="$(payload_for "$url")"; then
    not_ok "$label: render command failed"
    return
  fi

  PAYLOAD_JSON="$payload" CHECK="$check" node <<'NODE'
const payload = JSON.parse(process.env.PAYLOAD_JSON || "{}");
const check = process.env.CHECK;

if (check === "wecom") {
  if (payload.msgtype !== "markdown") process.exit(1);
  if (!payload.markdown?.content?.includes("PIG alert")) process.exit(1);
} else if (check === "feishu") {
  if (payload.msg_type !== "text") process.exit(1);
  if (!payload.content?.text?.includes("PIG alert")) process.exit(1);
} else if (check === "dingtalk") {
  if (payload.msgtype !== "text") process.exit(1);
  if (!payload.text?.content?.includes("PIG alert")) process.exit(1);
} else {
  process.exit(2);
}
NODE

  if [ "$?" -eq 0 ]; then
    ok "$label"
  else
    not_ok "$label: unexpected payload $payload"
  fi
}

assert_payload "render Enterprise WeChat markdown payload" \
  "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test" \
  "wecom"
assert_payload "render Feishu text payload" \
  "https://open.feishu.cn/open-apis/bot/v2/hook/test" \
  "feishu"
assert_payload "render DingTalk text payload" \
  "https://oapi.dingtalk.com/robot/send?access_token=test" \
  "dingtalk"

echo
echo "PASS: $PASS"
echo "FAIL: $FAIL"

[ "$FAIL" = 0 ]
