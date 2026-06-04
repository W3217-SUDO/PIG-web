#!/usr/bin/env bash
# PIG production smoke test.
# Usage:
#   bash scripts/smoke-prod.sh
# Environment overrides:
#   ROOT=https://www.rockingwei.online
#   BASE=https://www.rockingwei.online/api

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./smoke-prod-diagnostics.sh
. "$SCRIPT_DIR/smoke-prod-diagnostics.sh"

BASE="${BASE:-https://www.rockingwei.online/api}"
ROOT="${ROOT:-https://www.rockingwei.online}"
HTTP_ROOT="${HTTP_ROOT:-${ROOT/https:/http:}}"

PASS=0
FAIL=0

green() { printf "  \033[32mPASS\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
red()   { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }
hdr()   { printf "\n== %s ==\n" "$1"; }

expect_status() {
  local url="$1" expected="$2" label="$3"
  shift 3
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$@" "$url" 2>&1)
  if [ "$actual" = "$expected" ]; then
    green "$label -> $actual"
  else
    red "$label -> expected $expected, got $actual"
  fi
}

expect_body_contains() {
  local url="$1" needle="$2" label="$3"
  shift 3
  local body
  body=$(curl -s -m 10 "$@" "$url" 2>&1)
  if printf "%s" "$body" | grep -q "$needle"; then
    green "$label contains '$needle'"
  else
    red "$label missing '$needle' (response: $(printf "%s" "$body" | head -c 80))"
  fi
}

echo "PIG production smoke test"
echo "Time: $(date -Iseconds 2>/dev/null || date)"
echo "Root: $ROOT"
echo "Base: $BASE"

hdr "0. Public entry diagnostics"
HTTP_HEADERS=$(curl -sS -D - -o /dev/null -m 10 "$HTTP_ROOT/" 2>&1 || true)
HTTP_CLASS=$(classify_http_entry "$HTTP_HEADERS")
case "$HTTP_CLASS" in
  dnspod-webblock)
    red "HTTP entry is blocked by DNSPod webblock. Check ICP filing, Tencent Cloud filing access, and DNSPod status."
    ;;
  *)
    green "HTTP entry is not DNSPod webblock"
    ;;
esac

HTTPS_PROBE=$(curl -sS -o /dev/null -w "code=%{http_code} err=%{errormsg}" -m 15 "$BASE/health" 2>&1 || true)
HTTPS_CLASS=$(classify_https_entry "$HTTPS_PROBE")
case "$HTTPS_CLASS" in
  https-ok)
    green "HTTPS API entry is reachable"
    ;;
  https-http-*)
    green "HTTPS entry returned an HTTP response (${HTTPS_CLASS#https-http-}); TLS path is reachable"
    ;;
  https-tls-failed)
    red "HTTPS entry failed during TLS handshake. Check local tunnel/proxy, CDN/WAF, security group, and nginx/certificate chain."
    ;;
  https-unreachable)
    red "HTTPS entry is unreachable. Check DNS, security group, CDN/WAF, and local network path."
    ;;
  *)
    red "HTTPS entry status is unknown: $HTTPS_PROBE"
    ;;
esac

hdr "1. H5 SPA entry"
expect_status "$ROOT/" "200" "GET / (H5 index.html)"
expect_body_contains "$ROOT/" "<div id=\"app\"" "GET / app mount"
expect_body_contains "$ROOT/" "assets/index-" "GET / vite bundle"

hdr "2. Public API"
expect_status "$BASE/health" "200" "GET /api/health"
expect_body_contains "$BASE/health" "\"db\":\"ok\"" "/api/health db=ok"
expect_body_contains "$BASE/health" "\"redis\":\"ok\"" "/api/health redis=ok"
expect_body_contains "$BASE/health" "\"env\":\"production\"" "/api/health env=production"

expect_status "$BASE/pigs?pageSize=5" "200" "GET /api/pigs list"
expect_body_contains "$BASE/pigs?pageSize=5" "\"items\"" "list has items field"
expect_body_contains "$BASE/pigs?pageSize=5" "\"farmer\"" "list has farmer field"

hdr "3. Pig detail path"
PIG_ID=$(curl -s -m 10 "$BASE/pigs?pageSize=1" | grep -oE '"id":"[A-Z0-9]{26}"' | head -1 | sed 's/.*"\([^"]\+\)"/\1/')
if [ -n "$PIG_ID" ]; then
  green "Fetched pig_id: $PIG_ID"
  expect_status "$BASE/pigs/$PIG_ID" "200" "GET /api/pigs/:id"
  expect_status "$BASE/pigs/$PIG_ID/timeline" "200" "GET /api/pigs/:id/timeline"
  expect_body_contains "$BASE/pigs/$PIG_ID/timeline" "\"kind\":\"feeding\"" "timeline has feeding event"
  expect_body_contains "$BASE/pigs/$PIG_ID/timeline" "\"kind\":\"health\"" "timeline has health event"
else
  red "Cannot fetch pig_id from list. Production DB may not be seeded."
fi

hdr "4. Auth-protected APIs without token"
expect_status "$BASE/users/me" "401" "GET /api/users/me without token"
expect_status "$BASE/orders/me" "401" "GET /api/orders/me without token"
expect_status "$BASE/wallet/me" "401" "GET /api/wallet/me without token"
expect_status "$BASE/messages" "401" "GET /api/messages without token"

hdr "5. Error handling"
expect_status "$BASE/pigs/01XXXXXXXXXXXXXXXXXXXXXXXX" "404" "GET missing pig -> 404"
expect_status "$BASE/non-existent" "404" "GET missing route -> 404"

hdr "6. Static assets and bundle size"
HTML=$(curl -s -m 10 "$ROOT/" 2>&1)
JS_URL=$(printf "%s" "$HTML" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ -n "$JS_URL" ]; then
  green "Home references JS: $JS_URL"
  JS_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 15 "$ROOT$JS_URL")
  if [ "$JS_SIZE" -gt 10000 ] && [ "$JS_SIZE" -lt 500000 ]; then
    green "JS bundle size is reasonable: $((JS_SIZE / 1024)) KB"
  else
    red "JS bundle size is abnormal: $JS_SIZE bytes (expected 10KB-500KB)"
  fi
else
  red "Home page does not reference JS bundle"
fi

hdr "Summary"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
if [ "$FAIL" = 0 ]; then
  printf "\n\033[32mALL GREEN\033[0m\n"
  exit 0
fi

printf "\n\033[31m%d checks failed\033[0m\n" "$FAIL"
exit 1
