#!/usr/bin/env bash
# PIG W1 local smoke test.
# Preconditions:
#   - Backend is running, usually: npm run dev:backend
#   - MySQL/Redis are running and dev seed data exists.
# Usage:
#   bash scripts/smoke-w1.sh
#   BASE=http://127.0.0.1:3000/api bash scripts/smoke-w1.sh

set -u

BASE="${BASE:-http://127.0.0.1:3000/api}"
OPENID="${OPENID:-smoke_w1_user}"
SMOKE_MUTATE="${SMOKE_MUTATE:-0}"
PASS=0
FAIL=0

green() { printf "  \033[32mOK\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
red() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }
hdr() { printf "\n== %s ==\n" "$1"; }

curl_body() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  shift 3 || true
  if [ -n "$data" ]; then
    curl -sS -m 15 -X "$method" "$url" -H "Content-Type: application/json" "$@" -d "$data"
  else
    curl -sS -m 15 -X "$method" "$url" "$@"
  fi
}

expect_status() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local label="$4"
  local data="${5:-}"
  shift 5 || true
  local actual
  if [ -n "$data" ]; then
    actual=$(curl -sS -o /dev/null -w "%{http_code}" -m 15 -X "$method" "$url" -H "Content-Type: application/json" "$@" -d "$data" 2>/dev/null || true)
  else
    actual=$(curl -sS -o /dev/null -w "%{http_code}" -m 15 -X "$method" "$url" "$@" 2>/dev/null || true)
  fi
  if [ "$actual" = "$expected" ]; then
    green "$label -> HTTP $actual"
  else
    red "$label -> expected HTTP $expected, got ${actual:-curl-error}"
  fi
}

require_nonempty() {
  local value="$1"
  local label="$2"
  if [ -n "$value" ]; then
    green "$label"
  else
    red "$label"
  fi
}

echo "PIG W1 smoke"
echo "Base: $BASE"
echo "Time: $(date -Iseconds 2>/dev/null || date)"

hdr "1. Public health and catalog"
expect_status GET "$BASE/health" 200 "GET /health" ""

HEALTH_BODY=$(curl_body GET "$BASE/health" "")
if echo "$HEALTH_BODY" | grep -q '"db":"ok"'; then green "health db=ok"; else red "health db=ok"; fi
if echo "$HEALTH_BODY" | grep -q '"redis":"ok"'; then green "health redis=ok"; else red "health redis=ok"; fi

PIGS_BODY=$(curl_body GET "$BASE/pigs?pageSize=10" "")
PIG_ID=$(printf '%s' "$PIGS_BODY" | node -e "
const fs = require('fs');
const res = JSON.parse(fs.readFileSync(0, 'utf8'));
const data = res.data || res;
const pig = (data.items || []).find((item) => item.status === 'listed' && item.totalShares > item.soldShares);
if (pig) process.stdout.write(pig.id);
" 2>/dev/null || true)
require_nonempty "$PIG_ID" "found listed pig with remaining shares"

if [ -n "$PIG_ID" ]; then
  expect_status GET "$BASE/pigs/$PIG_ID" 200 "GET /pigs/:id" ""
  expect_status GET "$BASE/pigs/$PIG_ID/timeline" 200 "GET /pigs/:id/timeline" ""
fi

hdr "2. Auth flow"
LOGIN_BODY=$(curl_body POST "$BASE/auth/dev-login" "{\"openid\":\"$OPENID\"}")
TOKEN=$(printf '%s' "$LOGIN_BODY" | node -e "
const fs = require('fs');
const res = JSON.parse(fs.readFileSync(0, 'utf8'));
const data = res.data || res;
if (data.access_token) process.stdout.write(data.access_token);
" 2>/dev/null || true)
USER_ID=$(printf '%s' "$LOGIN_BODY" | node -e "
const fs = require('fs');
const res = JSON.parse(fs.readFileSync(0, 'utf8'));
const data = res.data || res;
if (data.user && data.user.id) process.stdout.write(data.user.id);
" 2>/dev/null || true)
require_nonempty "$TOKEN" "dev-login returns access_token"
require_nonempty "$USER_ID" "dev-login returns user.id"

if [ -n "$TOKEN" ]; then
  expect_status GET "$BASE/auth/me" 200 "GET /auth/me with token" "" -H "Authorization: Bearer $TOKEN"
  expect_status GET "$BASE/orders/me" 200 "GET /orders/me with token" "" -H "Authorization: Bearer $TOKEN"
  expect_status GET "$BASE/wallet/me" 200 "GET /wallet/me with token" "" -H "Authorization: Bearer $TOKEN"
  expect_status GET "$BASE/messages" 200 "GET /messages with token" "" -H "Authorization: Bearer $TOKEN"
fi

hdr "3. Order and share flow"
ORDER_ID=""
if [ -n "$TOKEN" ] && [ -n "$PIG_ID" ]; then
  ORDER_BODY=$(curl_body POST "$BASE/orders" "{\"pigId\":\"$PIG_ID\",\"sharesCount\":1,\"remark\":\"smoke-w1\"}" -H "Authorization: Bearer $TOKEN")
  ORDER_ID=$(printf '%s' "$ORDER_BODY" | node -e "
const fs = require('fs');
const res = JSON.parse(fs.readFileSync(0, 'utf8'));
const data = res.data || res;
if (data.id) process.stdout.write(data.id);
" 2>/dev/null || true)
  require_nonempty "$ORDER_ID" "POST /orders returns order.id"
fi

if [ -n "$TOKEN" ] && [ -n "$ORDER_ID" ]; then
  expect_status GET "$BASE/orders/$ORDER_ID" 200 "GET /orders/:id" "" -H "Authorization: Bearer $TOKEN"

  if [ "$SMOKE_MUTATE" = "1" ]; then
    expect_status POST "$BASE/orders/$ORDER_ID/mock-paid" 201 "POST /orders/:id/mock-paid" "" -H "Authorization: Bearer $TOKEN"

    SHARE_BODY=$(curl_body POST "$BASE/orders/$ORDER_ID/share" "" -H "Authorization: Bearer $TOKEN")
    SHARE_CODE=$(printf '%s' "$SHARE_BODY" | node -e "
const fs = require('fs');
const res = JSON.parse(fs.readFileSync(0, 'utf8'));
const data = res.data || res;
if (data.code) process.stdout.write(data.code);
else if (data.invite && data.invite.code) process.stdout.write(data.invite.code);
" 2>/dev/null || true)
    require_nonempty "$SHARE_CODE" "POST /orders/:id/share returns share code"
    if [ -n "$SHARE_CODE" ]; then
      expect_status GET "$BASE/share/$SHARE_CODE" 200 "GET /share/:code public lookup" ""
      expect_status GET "$BASE/share/$SHARE_CODE/members" 200 "GET /share/:code/members" "" -H "Authorization: Bearer $TOKEN"
    fi
  else
    expect_status POST "$BASE/orders/$ORDER_ID/cancel" 201 "POST /orders/:id/cancel" "" -H "Authorization: Bearer $TOKEN"
    green "mock pay/share skipped; set SMOKE_MUTATE=1 to test paid share flow"
  fi
fi

hdr "4. Protected boundary"
expect_status GET "$BASE/auth/me" 401 "GET /auth/me without token" ""
expect_status GET "$BASE/orders/me" 401 "GET /orders/me without token" ""
expect_status GET "$BASE/wallet/me" 401 "GET /wallet/me without token" ""
expect_status GET "$BASE/messages" 401 "GET /messages without token" ""

hdr "Summary"
echo "PASS: $PASS"
echo "FAIL: $FAIL"

if [ "$FAIL" = 0 ]; then
  echo "W1 smoke passed."
  exit 0
fi

echo "W1 smoke failed."
exit 1
