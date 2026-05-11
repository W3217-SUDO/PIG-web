import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type Redis as RedisClient } from 'ioredis';

/**
 * Redis 客户端 DI token。
 * 注入方式: @Inject(REDIS_CLIENT) private readonly redis: Redis
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisClient => {
        const logger = new Logger('RedisModule');
        const host = config.get<string>('redis.host', '127.0.0.1');
        const port = config.get<number>('redis.port', 6379);
        const password = config.get<string>('redis.pass') || undefined;
        const db = config.get<number>('redis.db', 0);

        const client = new Redis({
          host,
          port,
          password,
          db,
          // 启动期不阻塞: 连不上不抛, 由 health check 暴露
          lazyConnect: false,
          enableOfflineQueue: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });

        client.on('connect', () => logger.log(`connected ${host}:${port} db=${db}`));
        client.on('error', (err) => logger.warn(`error: ${err.message}`));
        client.on('reconnecting', (ms: number) => logger.warn(`reconnecting in ${ms}ms`));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  // Nest 关闭时优雅断开连接 (provider 没有 onModuleDestroy 钩子, 由模块本身处理)
  async onModuleDestroy() {
    // 实际客户端在 provider 里, 这里不直接访问;
    // Nest 应用关闭时 provider 不会自动 quit, 由进程退出统一回收.
    // 如需精细控制, 在 main.ts 里调用 app.close() 前手动 quit.
  }
}
