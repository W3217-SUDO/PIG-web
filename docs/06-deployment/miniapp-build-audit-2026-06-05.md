# Mini Program Build Audit - 2026-06-05

Build artifact: `frontend/dist/build/mp-weixin`

## Commands

```bash
npm -w frontend run build:mp-weixin
npm run audit:miniapp
```

## Result

- Build: pass.
- Audit: 13 PASS / 0 FAIL.
- AppID: `wx7aaf3180b690e871`.
- API base: `https://www.rockingwei.online/api`.
- `project.config.json -> setting.urlCheck`: `true`.
- Forbidden dev/test strings: absent.
- Package size: about 310 KB.

## CI Gate

`CI` now runs:

```bash
npm -w frontend run build:mp-weixin
npm run audit:miniapp
```

This blocks accidental submission packages that contain localhost, dev-login, mock payment endpoints, wallet top-up endpoints, or disabled legal-domain checks.
