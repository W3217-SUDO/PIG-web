import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import * as os from 'node:os';
import { statfs } from 'node:fs/promises';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check() {
    const [dbOk, redisOk, system] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.systemStats(),
    ]);
    const diskOk = system.disk.status === 'ok';
    return {
      status: dbOk && redisOk && diskOk ? 'ok' : 'degraded',
      uptime_seconds: Math.floor(process.uptime()),
      db: dbOk ? 'ok' : 'fail',
      redis: redisOk ? 'ok' : 'fail',
      version: process.env.APP_VERSION || '0.1.0',
      commit: process.env.GIT_COMMIT || 'dev',
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
      system,
    };
  }

  /** 进程 + 主机资源(用于监控告警, 30 秒以下应是常量) */
  private async systemStats() {
    const proc = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const disk = await this.diskStats();
    return {
      pid: process.pid,
      node: process.version,
      // 进程级
      process_rss_mb: Math.round(proc.rss / 1024 / 1024),
      process_heap_used_mb: Math.round(proc.heapUsed / 1024 / 1024),
      // 主机级
      load_1m: parseFloat(os.loadavg()[0].toFixed(2)),
      load_5m: parseFloat(os.loadavg()[1].toFixed(2)),
      mem_total_mb: Math.round(totalMem / 1024 / 1024),
      mem_free_mb: Math.round(freeMem / 1024 / 1024),
      mem_used_pct: parseFloat(((1 - freeMem / totalMem) * 100).toFixed(1)),
      cpu_count: os.cpus().length,
      host_uptime_hours: parseFloat((os.uptime() / 3600).toFixed(1)),
      disk,
      pm2: this.pm2Stats(),
    };
  }

  private async diskStats() {
    const path = process.env.HEALTH_DISK_PATH || process.env.STORAGE_LOCAL_DIR || process.cwd();
    try {
      const stats = await statfs(path);
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const usedPct = totalBytes > 0 ? (1 - freeBytes / totalBytes) * 100 : 0;

      return {
        status: 'ok' as const,
        path,
        total_mb: Math.round(totalBytes / 1024 / 1024),
        free_mb: Math.round(freeBytes / 1024 / 1024),
        used_pct: parseFloat(usedPct.toFixed(1)),
      };
    } catch (err) {
      this.logger.warn({ err, path }, 'disk health fail');
      return {
        status: 'fail' as const,
        path,
        total_mb: 0,
        free_mb: 0,
        used_pct: 0,
      };
    }
  }

  private pm2Stats() {
    const pmId = process.env.pm_id || process.env.PM_ID;
    return {
      managed: Boolean(pmId || process.env.NODE_APP_INSTANCE || process.env.name),
      pm_id: pmId ?? null,
      name: process.env.name || process.env.pm_exec_path || null,
      node_app_instance: process.env.NODE_APP_INSTANCE ?? null,
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) return false;
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (err) {
      this.logger.warn({ err }, 'db health fail');
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (err) {
      this.logger.warn({ err }, 'redis health fail');
      return false;
    }
  }
}
