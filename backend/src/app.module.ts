import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';

import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';

import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AddressModule } from './modules/address/address.module';
import { PigModule } from './modules/pig/pig.module';
import { FarmerModule } from './modules/farmer/farmer.module';
import { OrderModule } from './modules/order/order.module';
import { WalletModule } from './modules/wallet/wallet.module';
// 业务模块逐步加入(各自独立 PR)
// import { ShareModule } from './modules/share/share.module';

@Module({
  imports: [
    // 配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),

    // 日志(Pino)
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('log.level', 'info'),
          transport: config.get<boolean>('log.pretty')
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname,req,res',
                  messageFormat: '[{context}] {msg}',
                },
              }
            : undefined,
          customProps: () => ({ app: 'pig-backend' }),
          serializers: {
            req(req) {
              return { id: req.id, method: req.method, url: req.url };
            },
            res(res) {
              return { statusCode: res.statusCode };
            },
          },
          redact: {
            paths: [
              'req.headers.authorization',
              '*.password',
              '*.session_key',
              '*.id_card',
              '*.access_token',
              '*.refresh_token',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),

    // 限流
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60) * 1000,
          limit: config.get<number>('throttle.limit', 60),
        },
      ],
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // 数据库(开发期允许 DB 没起来也能启动,数据库相关接口才报错)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.pass'),
        database: config.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: config.get<boolean>('database.logging'),
        charset: 'utf8mb4',
        timezone: '+08:00',
        retryAttempts: process.env.NODE_ENV === 'development' ? 1 : 10,
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
    }),

    // Redis (全局, 提供 REDIS_CLIENT)
    RedisModule,

    // 业务模块
    HealthModule,
    UserModule,
    AuthModule,
    AddressModule,
    FarmerModule,
    PigModule,
    OrderModule,
    WalletModule,
    // ShareModule,
  ],
})
export class AppModule {}
