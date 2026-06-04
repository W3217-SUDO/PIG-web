# Production Health Alert Cron

Date: 2026-06-05

This project installs `/opt/pig/bin/pig-health-alert.sh` during backend deployment and runs it every minute through cron.

## Checks

- `GET http://127.0.0.1:3000/api/health` must return `data.status=ok`.
- MySQL health must be `data.db=ok`.
- Redis health must be `data.redis=ok`.
- Backup health must be `data.system.backup.status=ok`.
- Disk health must be `data.system.disk.status=ok`.
- Runtime commit must be a real Git commit, not `dev` or `unknown`.
- PM2 app `pig-backend` must exist and every instance must be `online`.
- PM2 restart count must not exceed `PM2_RESTART_THRESHOLD`, default `3`.

## Server files

- Script: `/opt/pig/bin/pig-health-alert.sh`
- Log: `/opt/pig/logs/pig-health-alert.log`
- Env source: `/opt/pig/shared/.env.production`
- Cron:

```cron
* * * * * /opt/pig/bin/pig-health-alert.sh >> /opt/pig/logs/pig-health-alert.log 2>&1
```

## Alert webhook

Set `ALERT_WEBHOOK_URL` in `/opt/pig/shared/.env.production`.

- Enterprise WeChat webhook URLs use a markdown payload.
- Other webhook URLs use a generic text payload.
- If `ALERT_WEBHOOK_URL` is empty, the script logs the failure and does not print secrets.

## Manual verification

```bash
bash -n /opt/pig/bin/pig-health-alert.sh
/opt/pig/bin/pig-health-alert.sh
tail -n 50 /opt/pig/logs/pig-health-alert.log
crontab -l | grep pig-health-alert
```

Expected healthy log:

```text
OK health/db/redis/disk/backup/pm2 checks passed
```
