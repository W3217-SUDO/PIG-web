/**
 * Sentry 错误上报(后端)
 * 设计:
 * - 无 SENTRY_DSN 时 init() 是 no-op,不增加任何开销
 * - 显式调 captureException(err, ctx?) 上报
 * - 自动捕获 traceId 关联请求
 *
 * 使用:
 *   import { initSentry, captureException } from './common/sentry/sentry';
 *   initSentry();   // main.ts 启动时
 *   captureException(err, { trace_id, url, user });
 */
import * as Sentry from '@sentry/node';

let inited = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (inited) return true;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || process.env.GIT_COMMIT || '0.1.0',
    // 性能采样(慢请求 trace),v1 用低采样率
    tracesSampleRate: 0.05,
    // 屏蔽敏感字段
    beforeSend(event) {
      // 移除请求头里的 Authorization
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
  inited = true;
  // eslint-disable-next-line no-console
  console.log(`🐷 Sentry initialized: env=${process.env.NODE_ENV} dsn=${dsn.slice(0, 30)}...`);
  return true;
}

export function captureException(err: unknown, ctx?: Record<string, unknown>): void {
  if (!inited) return;
  Sentry.withScope((scope) => {
    if (ctx) {
      for (const [k, v] of Object.entries(ctx)) {
        if (k === 'user' && v) {
          scope.setUser(v as Record<string, unknown>);
        } else {
          scope.setExtra(k, v);
        }
      }
    }
    Sentry.captureException(err);
  });
}

export function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!inited) return Promise.resolve(true);
  return Sentry.flush(timeoutMs);
}
