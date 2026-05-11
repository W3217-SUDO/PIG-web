import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
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
