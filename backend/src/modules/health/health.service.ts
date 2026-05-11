import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check() {
    const dbOk = await this.checkDb();
    return {
      status: dbOk ? 'ok' : 'degraded',
      uptime_seconds: Math.floor(process.uptime()),
      db: dbOk ? 'ok' : 'fail',
      redis: 'unknown', // Redis 模块接入后再补
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
}
