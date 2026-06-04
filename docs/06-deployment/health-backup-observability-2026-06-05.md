# Health Backup Observability - 2026-06-05

## Purpose

`/api/health` now reports MySQL backup freshness in addition to DB, Redis, memory, disk, PM2, and deployed commit metadata.

This lets deployment and monitoring answer one critical production question directly: the service may be alive, but is the latest database backup present and fresh enough?

## Response Field

The field is returned at:

```text
data.system.backup
```

Example:

```json
{
  "status": "ok",
  "path": "/opt/pig/shared/backups",
  "count": 1,
  "latest_file": "pig-2026-06-05_06-39-50.sql.gz",
  "latest_at": "2026-06-05T06:39:50.000Z",
  "latest_age_hours": 0.25,
  "latest_size_bytes": 123456,
  "max_age_hours": 36
}
```

## Status Rules

| status | Meaning |
| --- | --- |
| `ok` | At least one backup exists and the latest backup age is within `max_age_hours`. |
| `stale` | A backup exists, but the latest backup is older than `max_age_hours`. |
| `fail` | Backup directory cannot be read, or no matching backup file exists. |

If backup status is not `ok`, the top-level `/api/health.data.status` becomes `degraded`.

## Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `HEALTH_BACKUP_DIR` | `/opt/pig/shared/backups` | Directory scanned by `/api/health`. |
| `HEALTH_BACKUP_MAX_AGE_HOURS` | `36` | Maximum accepted age for the newest backup. |

Matching backup filename format:

```text
pig-YYYY-MM-DD_HH-MM-SS.sql.gz
```

## Production Commands

Check current health from the server:

```bash
ssh pig 'curl -fsS http://127.0.0.1:3000/api/health'
```

Create a manual backup:

```bash
ssh pig '/opt/pig/bin/mysql-backup.sh'
```

Verify backup integrity:

```bash
ssh pig '/opt/pig/bin/mysql-backup-verify.sh'
```

Run a restore verification into a temporary database:

```bash
ssh pig 'RESTORE_CHECK=1 /opt/pig/bin/mysql-backup-verify.sh'
```

## Current Production Baseline

- Backup directory: `/opt/pig/shared/backups`
- Daily backup cron: `0 3 * * * /opt/pig/bin/mysql-backup.sh`
- Daily integrity cron: `10 3 * * * /opt/pig/bin/mysql-backup-verify.sh`
- Weekly restore cron: `20 3 * * 0 RESTORE_CHECK=1 /opt/pig/bin/mysql-backup-verify.sh`
- Latest verified backup during audit: `/opt/pig/shared/backups/pig-2026-06-05_06-39-50.sql.gz`
