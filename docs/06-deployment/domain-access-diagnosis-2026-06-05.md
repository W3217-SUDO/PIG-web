# Domain Access Diagnosis - 2026-06-05

Domain: `www.rockingwei.online`

## Summary

The production app and nginx are healthy on the server, but external HTTPS access is still not reliable from the local workstation. This is currently an access-layer/domain issue, not an application runtime issue.

## Verified Working

- DNS A record resolves to the CVM:
  - `www.rockingwei.online -> 175.24.175.123`
  - `rockingwei.online -> 175.24.175.123`
- Server-side production smoke passes:
  - `PASS: 24`
  - `FAIL: 0`
- nginx config test passes:
  - `nginx: configuration file /etc/nginx/nginx.conf test is successful`
- nginx listens on `0.0.0.0:443` and `[::]:443`.
- Server-local TLS through nginx works:
  - `curl --resolve www.rockingwei.online:443:127.0.0.1 https://www.rockingwei.online/api/health`
  - Result: `HTTP/1.1 200 OK`, `env=production`, `db=ok`, `redis=ok`.

## External Failure From Local Workstation

Commands:

```powershell
npm run smoke:prod
curl.exe -vk --max-time 20 https://www.rockingwei.online/api/health
openssl s_client -connect www.rockingwei.online:443 -servername www.rockingwei.online -brief -tls1_2
```

Observed:

- `npm run smoke:prod`: fails externally because HTTPS requests return status `000`.
- `curl.exe -vk`: TCP connects to `175.24.175.123:443`, then fails during TLS handshake.
- `openssl s_client`: `unexpected eof while reading`.
- `Test-NetConnection www.rockingwei.online -Port 443`: `TcpTestSucceeded: True`.

Interpretation:

- Port 443 is reachable at TCP level.
- TLS is closed before a proper server response reaches the client.
- Since server-local TLS succeeds, the remaining likely causes are Tencent Cloud domain access/ICP status, edge filtering, security group/CVM network policy outside the OS, or local network/proxy path behavior.

## Owner/Tencent Cloud Checklist

1. Confirm ICP filing is completed and attached to Tencent Cloud for `rockingwei.online`.
2. Confirm DNSPod/domain webblock status is cleared for both:
   - `rockingwei.online`
   - `www.rockingwei.online`
3. In Tencent Cloud CVM security group, confirm inbound rules allow:
   - TCP `80` from `0.0.0.0/0`
   - TCP `443` from `0.0.0.0/0`
4. Confirm no Tencent Cloud WAF, site protection, CDN, or SSL proxy rule is bound to this domain unless intentionally configured.
5. Test from a normal mobile network without local proxy/VPN:
   - `https://www.rockingwei.online/`
   - `https://www.rockingwei.online/api/health`

## Current Release Impact

- Server-side H5/API are healthy.
- WeChat Mini Program production request domain still depends on public HTTPS access being stable.
- Do not submit the mini program for review until external HTTPS works from at least one normal public network and one mobile network.
