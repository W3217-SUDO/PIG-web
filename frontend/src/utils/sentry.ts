/**
 * Sentry 错误上报(前端)
 *
 * 条件编译: 仅 H5 端启用(@sentry/browser 依赖浏览器 API)
 * 小程序/APP 端 init/capture 都是 no-op
 *
 * 启用方法: frontend/.env.production 设 VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
 * 没 DSN 时 init 不做任何事,零开销
 */

let inited = false;

export function initSentry(): void {
  // #ifdef H5
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  if (inited) return;
  // 动态 import 避免 mp-weixin / app 端编译时引入浏览器 API
  import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        environment: ((import.meta as any).env?.MODE as string) || 'production',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        release: ((import.meta as any).env?.VITE_APP_VERSION as string) || '0.1.0',
        tracesSampleRate: 0.05,
        beforeSend(event) {
          if (event.request?.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
          }
          return event;
        },
      });
      inited = true;
      // eslint-disable-next-line no-console
      console.log('🐷 Sentry initialized (H5):', dsn.slice(0, 30) + '...');
    })
    .catch(() => {
      // 静默忽略
    });
  // #endif
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureException(err: unknown, ctx?: Record<string, any>): void {
  // #ifdef H5
  if (!inited) return;
  import('@sentry/browser')
    .then((Sentry) => {
      Sentry.withScope((scope) => {
        if (ctx) {
          for (const [k, v] of Object.entries(ctx)) {
            scope.setExtra(k, v);
          }
        }
        Sentry.captureException(err);
      });
    })
    .catch(() => {
      // 静默
    });
  // #endif
  // #ifndef H5
  // 小程序/APP 端: 暂时仅 console
  // 后续 v1.5 可接微信小程序云端日志 / uni-app Sentry
  // eslint-disable-next-line no-console
  console.warn('[err]', err, ctx);
  // #endif
}
