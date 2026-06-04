import { describe, expect, it, jest } from '@jest/globals';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { HealthService } from './health.service';

describe('HealthService', () => {
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
    process.env.pm_id = '0';
    process.env.name = 'pig-backend';

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
      process.env.pm_id = oldPmId;
      process.env.name = oldName;
    }
  });
});
