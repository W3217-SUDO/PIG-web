import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import * as os from 'node:os';
import * as path from 'node:path';
import { readdir, stat, statfs } from 'node:fs/promises';
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
    const backupOk = system.backup.status === 'ok';
    return {
      status: dbOk && redisOk && diskOk && backupOk ? 'ok' : 'degraded',
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
    const [disk, backup] = await Promise.all([this.diskStats(), this.backupStats()]);
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
      backup,
      pm2: this.pm2Stats(),
    };
  }

  private async backupStats() {
    const backupDir = process.env.HEALTH_BACKUP_DIR || '/opt/pig/shared/backups';
    const configuredMaxAgeHours = Number(process.env.HEALTH_BACKUP_MAX_AGE_HOURS);
    const maxAgeHours = Number.isFinite(configuredMaxAgeHours) && configuredMaxAgeHours > 0 ? configuredMaxAgeHours : 36;
    try {
      const entries = await readdir(backupDir, { withFileTypes: true });
      const backupFiles = entries
        .filter((entry) => entry.isFile() && /^pig-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sql\.gz$/.test(entry.name))
        .map((entry) => entry.name);

      if (backupFiles.length === 0) {
        return {
          status: 'fail' as const,
          path: backupDir,
          count: 0,
          latest_file: null,
          latest_at: null,
          latest_age_hours: null,
          latest_size_bytes: 0,
          max_age_hours: maxAgeHours,
        };
      }

      const stats = await Promise.all(
        backupFiles.map(async (file) => ({
          file,
          stats: await stat(path.join(backupDir, file)),
        })),
      );
      stats.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

      const latest = stats[0];
      const ageHours = (Date.now() - latest.stats.mtimeMs) / 1000 / 3600;
      const status = ageHours <= maxAgeHours ? 'ok' : 'stale';

      return {
        status: status as 'ok' | 'stale',
        path: backupDir,
        count: stats.length,
        latest_file: latest.file,
        latest_at: latest.stats.mtime.toISOString(),
        latest_age_hours: parseFloat(ageHours.toFixed(2)),
        latest_size_bytes: latest.stats.size,
        max_age_hours: maxAgeHours,
      };
    } catch (err) {
      this.logger.warn({ err, path: backupDir }, 'backup health fail');
      return {
        status: 'fail' as const,
        path: backupDir,
        count: 0,
        latest_file: null,
        latest_at: null,
        latest_age_hours: null,
        latest_size_bytes: 0,
        max_age_hours: maxAgeHours,
      };
    }
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
