/**
 * E2E 测试用的 NestJS App 工厂 + 工具函数
 * 跟 main.ts 同步配置(global prefix / pipes / interceptors / filters)
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseWrapInterceptor } from '../../src/common/interceptors/response-wrap.interceptor';

export async function createTestApp(): Promise<INestApplication> {
  const mod = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = mod.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseWrapInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

/** 用 dev-login 拿一个 token,后续测试 携带 */
export async function devLogin(
  app: INestApplication,
  openid = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
): Promise<{ token: string; userId: string; openid: string }> {
  // NestJS POST 默认返 201,不强求 status,只看 body.code === 0
  const res = await request(app.getHttpServer())
    .post('/api/auth/dev-login')
    .send({ openid });
  if (res.body?.code !== 0) {
    throw new Error(
      `devLogin failed: HTTP ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return {
    token: res.body.data.access_token,
    userId: res.body.data.user.id,
    openid: res.body.data.user.openid,
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** 期望响应体格式 { code: 0, message: 'ok', data: ... }, 返回 data */
export function expectOk<T = unknown>(res: { body: { code: number; data: T } }): T {
  if (res.body.code !== 0) {
    throw new Error(`Expected code 0 but got ${res.body.code}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}
