import 'reflect-metadata';
// Sentry 必须在所有业务代码之前 init(才能捕获 module 加载阶段的错误)
import { initSentry } from './common/sentry/sentry';
initSentry();

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { static as serveStatic } from 'express';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseWrapInterceptor } from './common/interceptors/response-wrap.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // 用 Pino 替换默认 logger
  app.useLogger(app.get(Logger));

  // 全局前缀(配合 nginx /api 反代)
  app.setGlobalPrefix('api');

  // 安全 headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const uploadDir = resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR || './uploads');
  app.use('/uploads', serveStatic(uploadDir, { maxAge: '7d', index: false }));

  // H5 静态文件托管（uni-app 编译输出）
  const h5Dir = resolve(process.cwd(), '../frontend/dist/build/h5');
  if (existsSync(h5Dir)) {
    // 静态资源
    app.use('/', serveStatic(h5Dir, { maxAge: '1h', index: false }));
    // SPA fallback：所有非 /api、/uploads 路由都返回 index.html（支持 hash 路由刷新）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((req: any, res: any, next: any) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(join(h5Dir, 'index.html'));
      } else {
        next();
      }
    });
    console.log(`🌐  H5 Web:          http://0.0.0.0:${process.env.PORT || 3000}`);
  }

  // CORS
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  // 全局校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局响应包装 + 异常过滤(顺序:Filter 在最外,Interceptor 在内)
  app.useGlobalInterceptors(new ResponseWrapInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger(仅非生产)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PIG API')
      .setDescription('私人订猪 后端接口')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`🐷  Backend running on http://127.0.0.1:${port}/api`);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`📖  Swagger:        http://127.0.0.1:${port}/api/docs`);
  }
}

bootstrap();
