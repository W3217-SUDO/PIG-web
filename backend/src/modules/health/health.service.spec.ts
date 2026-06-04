import { describe, expect, it, jest } from '@jest/globals';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const restoreEnv = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  };

  it('returns system disk and pm2 observability fields', async () => {
    const dataSource = {
      isInitialized: true,
      query: (jest.fn() as any).mockResolvedValue([{ ok: 1 }]),
    } as unknown as DataSource;
    const redis = {
      ping: (jest.fn() as any).mockResolvedValue('PONG'),
    } as unknown as Redis;

    const service = new HealthService(dataSource, redis);
    const oldPmId = process.env.pm_id;
    const oldName = process.env.name;
    const oldBackupDir = process.env.HEALTH_BACKUP_DIR;
    const oldBackupMaxAge = process.env.HEALTH_BACKUP_MAX_AGE_HOURS;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pig-backup-health-'));
    fs.writeFileSync(path.join(dir, 'pig-2026-06-05_03-00-01.sql.gz'), 'backup');
    process.env.pm_id = '0';
    process.env.name = 'pig-backend';
    process.env.HEALTH_BACKUP_DIR = dir;
    process.env.HEALTH_BACKUP_MAX_AGE_HOURS = '999999';

    try {
      const health = await service.check();

      expect(health.status).toBe('ok');
      expect(health.system.disk.status).toBe('ok');
      expect(health.system.disk.path).toBeTruthy();
      expect(health.system.disk.total_mb).toBeGreaterThan(0);
      expect(health.system.disk.free_mb).toBeGreaterThan(0);
      expect(health.system.disk.used_pct).toBeGreaterThanOrEqual(0);
      expect(health.system.pm2).toEqual(
        expect.objectContaining({
          managed: true,
          pm_id: '0',
          name: 'pig-backend',
        }),
      );
    } finally {
      restoreEnv('pm_id', oldPmId);
      restoreEnv('name', oldName);
      restoreEnv('HEALTH_BACKUP_DIR', oldBackupDir);
      restoreEnv('HEALTH_BACKUP_MAX_AGE_HOURS', oldBackupMaxAge);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns backup freshness and inventory fields', async () => {
    const dataSource = {
      isInitialized: true,
      query: (jest.fn() as any).mockResolvedValue([{ ok: 1 }]),
    } as unknown as DataSource;
    const redis = {
      ping: (jest.fn() as any).mockResolvedValue('PONG'),
    } as unknown as Redis;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pig-backup-health-'));
    const backupFile = path.join(dir, 'pig-2026-06-05_03-00-01.sql.gz');
    fs.writeFileSync(backupFile, 'backup');

    const oldDir = process.env.HEALTH_BACKUP_DIR;
    const oldMaxAge = process.env.HEALTH_BACKUP_MAX_AGE_HOURS;
    process.env.HEALTH_BACKUP_DIR = dir;
    process.env.HEALTH_BACKUP_MAX_AGE_HOURS = '999999';

    try {
      const service = new HealthService(dataSource, redis);
      const health = await service.check();

      expect(health.status).toBe('ok');
      expect(health.system.backup).toEqual(
        expect.objectContaining({
          status: 'ok',
          path: dir,
          count: 1,
          latest_file: 'pig-2026-06-05_03-00-01.sql.gz',
          latest_size_bytes: 6,
        }),
      );
      expect(health.system.backup.latest_age_hours).toBeGreaterThanOrEqual(0);
    } finally {
      restoreEnv('HEALTH_BACKUP_DIR', oldDir);
      restoreEnv('HEALTH_BACKUP_MAX_AGE_HOURS', oldMaxAge);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
