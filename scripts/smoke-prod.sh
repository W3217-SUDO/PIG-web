#!/usr/bin/env bash
# PIG 生产环境 smoke 测试 · curl 一条龙
# 使用:
#   bash scripts/smoke-prod.sh
# 退出码:
#   0 = 全绿
#   1 = 任一检查 FAIL
# 适用场景:
#   - 部署后立即跑
#   - 上线前最终 check
#   - 故障排查 (看挂在哪一层)

set -u

BASE="${BASE:-https://www.rockingwei.online/api}"
ROOT="${ROOT:-https://www.rockingwei.online}"

PASS=0
FAIL=0

# helpers
green() { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
red()   { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
hdr()   { echo; echo "═══ $1 ═══"; }

expect_status() {
  local url="$1" expected="$2" label="$3"
  shift 3
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$@" "$url" 2>&1)
  if [ "$actual" = "$expected" ]; then
    green "$label → $actual"
  else
    red "$label → 期望 $expected, 实际 $actual"
  fi
}

expect_body_contains() {
  local url="$1" needle="$2" label="$3"
  shift 3
  local body
  body=$(curl -s -m 10 "$@" "$url" 2>&1)
  if echo "$body" | grep -q "$needle"; then
    green "$label 包含 '$needle'"
  else
    red "$label 缺 '$needle' (响应: $(echo "$body" | head -c 80))"
  fi
}

# ─────────────────────────────────────────
echo "🐷 PIG 生产 smoke 测试"
echo "时间: $(date -Iseconds 2>/dev/null || date)"
echo "Base: $BASE"
echo

hdr "1. H5 SPA 入口"
expect_status "$ROOT/" "200" "GET / (H5 index.html)"
expect_body_contains "$ROOT/" "私人订猪" "GET / 含 title '私人订猪'"
expect_body_contains "$ROOT/" "assets/index-" "GET / 引用 vite bundle"

hdr "2. 公开 API"
expect_status "$BASE/health" "200" "GET /api/health"
expect_body_contains "$BASE/health" "\"db\":\"ok\"" "/api/health db=ok"
expect_body_contains "$BASE/health" "\"redis\":\"ok\"" "/api/health redis=ok"
expect_body_contains "$BASE/health" "\"env\":\"production\"" "/api/health env=production"

expect_status "$BASE/pigs?pageSize=5" "200" "GET /api/pigs 列表"
expect_body_contains "$BASE/pigs?pageSize=5" "\"items\"" "列表含 items 字段"
expect_body_contains "$BASE/pigs?pageSize=5" "\"farmer\"" "列表含农户嵌套"

hdr "3. 详情链路"
PIG_ID=$(curl -s -m 10 "$BASE/pigs?pageSize=1" | grep -oE '"id":"[A-Z0-9]{26}"' | head -1 | sed 's/.*"\([^"]\+\)"/\1/')
if [ -n "$PIG_ID" ]; then
  green "拿到 pig_id: $PIG_ID"
  expect_status "$BASE/pigs/$PIG_ID" "200" "GET /api/pigs/:id"
  expect_status "$BASE/pigs/$PIG_ID/timeline" "200" "GET /api/pigs/:id/timeline"
  expect_body_contains "$BASE/pigs/$PIG_ID/timeline" "\"kind\":\"feeding\"" "timeline 含喂养事件"
  expect_body_contains "$BASE/pigs/$PIG_ID/timeline" "\"kind\":\"health\"" "timeline 含健康事件"
else
  red "无法从列表拿到 pig_id (生产库可能未 seed)"
fi

hdr "4. 鉴权接口 (无 token 应返回 401)"
expect_status "$BASE/users/me" "401" "GET /api/users/me 无 token"
expect_status "$BASE/orders/me" "401" "GET /api/orders/me 无 token"
expect_status "$BASE/wallet/me" "401" "GET /api/wallet/me 无 token"
expect_status "$BASE/messages" "401" "GET /api/messages 无 token"

hdr "5. 错误处理"
expect_status "$BASE/pigs/01XXXXXXXXXXXXXXXXXXXXXXXX" "404" "GET 不存在的 pig → 404"
expect_status "$BASE/non-existent" "404" "GET 不存在路径 → 404"

hdr "6. 静态资源 + 性能"
HTML=$(curl -s -m 10 "$ROOT/" 2>&1)
JS_URL=$(echo "$HTML" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ -n "$JS_URL" ]; then
  green "首页引用 JS: $JS_URL"
  JS_SIZE=$(curl -s -o /dev/null -w "%{size_download}" -m 15 "$ROOT$JS_URL")
  if [ "$JS_SIZE" -gt 10000 ] && [ "$JS_SIZE" -lt 500000 ]; then
    green "JS bundle 大小合理: $((JS_SIZE/1024)) KB"
  else
    red "JS bundle 大小异常: $JS_SIZE bytes (期望 10KB-500KB)"
  fi
else
  red "首页未引用 JS bundle"
fi
# API base 正确性: 通过 /api/pigs 真实返回数据来端到端证明(已在 §2 验过)
# (不再 grep bundle 内部, vite 拆 chunk 后字符串可能不在主 bundle 里)

# ─────────────────────────────────────────
hdr "汇总"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
if [ "$FAIL" = 0 ]; then
  printf "\n\033[32m✅ 全绿\033[0m\n"
  exit 0
else
  printf "\n\033[31m❌ %d 项失败\033[0m\n" "$FAIL"
  exit 1
fi
