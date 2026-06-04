#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./smoke-prod-diagnostics.sh
. "$SCRIPT_DIR/smoke-prod-diagnostics.sh"

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

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [ "$expected" = "$actual" ]; then
    ok "$label"
  else
    not_ok "$label: expected '$expected', got '$actual'"
  fi
}

assert_eq "dnspod-webblock" "$(classify_http_entry $'HTTP/1.1 302 OK\r\nLocation: https://dnspod.qcloud.com/static/webblock.html?d=www.rockingwei.online')" "detect DNSPod webblock"
assert_eq "http-ok" "$(classify_http_entry $'HTTP/1.1 301 Moved Permanently\r\nLocation: https://www.rockingwei.online/')" "accept normal HTTP redirect"
assert_eq "https-tls-failed" "$(classify_https_entry "code=000 err=schannel: failed to receive handshake, SSL/TLS connection failed")" "detect TLS handshake failure"
assert_eq "https-ok" "$(classify_https_entry "code=200 err=")" "accept HTTPS 200"
assert_eq "https-http-401" "$(classify_https_entry "code=401 err=")" "accept HTTPS HTTP status response"
assert_eq "https-unreachable" "$(classify_https_entry "code=000 err=Operation timed out")" "detect generic HTTPS unreachable"

echo
echo "PASS: $PASS"
echo "FAIL: $FAIL"

[ "$FAIL" = 0 ]
