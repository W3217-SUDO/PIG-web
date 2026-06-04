# MySQL Backup And Restore Audit - 2026-06-05

## Current Setup

- Backup script: `/opt/pig/bin/mysql-backup.sh`
- Verify script: `/opt/pig/bin/mysql-backup-verify.sh`
- Backup directory: `/opt/pig/shared/backups`
- Backup log: `/opt/pig/logs/mysql-backup.log`
- Verify log: `/opt/pig/logs/mysql-backup-verify.log`

## Cron

```cron
0 3 * * * /opt/pig/bin/mysql-backup.sh >> /opt/pig/logs/mysql-backup.log 2>&1
10 3 * * * /opt/pig/bin/mysql-backup-verify.sh >> /opt/pig/logs/mysql-backup-verify.log 2>&1
20 3 * * 0 RESTORE_CHECK=1 /opt/pig/bin/mysql-backup-verify.sh >> /opt/pig/logs/mysql-backup-verify.log 2>&1
```

## Verification Run

Commands run on the production server:

```bash
/opt/pig/bin/mysql-backup.sh
/opt/pig/bin/mysql-backup-verify.sh
RESTORE_CHECK=1 /opt/pig/bin/mysql-backup-verify.sh
```

Results:

- New backup created: `/opt/pig/shared/backups/pig-2026-06-05_06-39-50.sql.gz`
- Gzip integrity: pass
- SQL payload size: 38266 bytes
- Required tables present: `user`, `farmer`, `pig`, `address`, `wallet`, `wallet_transaction`, `order`, `order_payment`, `share_invite`, `message`, `feeding_record`, `health_record`
- Temporary restore database: `pig_restore_check_20260605064006`
- Restore table counts:
  - `user=2`
  - `farmer=2`
  - `pig=5`
  - `order=0`
  - `wallet=0`
  - `message=0`
- Restore verification: pass

The restore check imports into a temporary database and drops it afterwards. It does not modify the production `pig` database.
