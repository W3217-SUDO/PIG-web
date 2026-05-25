import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type Redis as RedisClient } from 'ioredis';

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
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
