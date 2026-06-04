# GitHub Actions Secrets

Last updated: 2026-06-05

## Backend Deploy Workflow

Workflow: `.github/workflows/deploy-backend.yml`

The backend deploy workflow uses the monorepo layout:

- runner: `npm ci` + `npm -w backend run build`
- archive: root `package.json` / `package-lock.json`, `backend/dist`, `backend/package.json`, `backend/db`
- server: `npm ci --omit=dev --workspace backend`
- upload/reload: native `ssh/scp`, then extract, switch `/opt/pig/current`, run migration, reload PM2

## Required Repository Secrets

Configure these in:

GitHub repository -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

| Secret | Value |
|---|---|
| `SSH_HOST` | `175.24.175.123` |
| `SSH_KEY` | Private key that can log in as `ubuntu`; paste the full key including BEGIN/END lines. |

## Current Status

- `CI` passes on `main`.
- `Deploy Backend` now passes install/build/archive.
- `Deploy Backend` currently fails at `upload + reload` immediately. First verify `SSH_HOST` and `SSH_KEY`.

## How To Verify After Adding Secrets

1. Open GitHub Actions.
2. Select `Deploy Backend`.
3. Click `Run workflow` on `main`.
4. The deploy job should reach `upload + reload`, upload `/tmp/release.tar.gz`, switch `/opt/pig/current`, reload `pig-backend`, and pass `curl http://127.0.0.1:3000/api/health`.

Server-side post-deploy check:

```bash
ssh pig 'pm2 list && curl -s http://127.0.0.1:3000/api/health'
```
