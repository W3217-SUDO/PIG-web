#!/usr/bin/env bash

classify_http_entry() {
  local headers="${1:-}"
  if printf "%s" "$headers" | grep -qi "dnspod.qcloud.com/static/webblock.html"; then
    printf "dnspod-webblock"
    return 0
  fi

  printf "http-ok"
}

classify_https_entry() {
  local probe="${1:-}"
  local code
  code=$(printf "%s" "$probe" | sed -n 's/.*code=\([0-9][0-9][0-9]\).*/\1/p' | head -1)

  if [ "$code" = "000" ]; then
    if printf "%s" "$probe" | grep -Eqi "handshake|SSL|TLS|schannel|certificate"; then
      printf "https-tls-failed"
      return 0
    fi

    printf "https-unreachable"
    return 0
  fi

  if [ -n "$code" ]; then
    if [ "$code" = "200" ]; then
      printf "https-ok"
    else
      printf "https-http-$code"
    fi
    return 0
  fi

  printf "https-unknown"
}
