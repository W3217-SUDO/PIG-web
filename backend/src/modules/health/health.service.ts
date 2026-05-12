import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import * as os from 'node:os';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check() {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      uptime_seconds: Math.floor(process.uptime()),
      db: dbOk ? 'ok' : 'fail',
      redis: redisOk ? 'ok' : 'fail',
      version: process.env.APP_VERSION || '0.1.0',
      commit: process.env.GIT_COMMIT || 'dev',
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
      system: this.systemStats(),
    };
  }

  /** 进程 + 主机资源(用于监控告警, 30 秒以下应是常量) */
  private systemStats() {
    const proc = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
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
