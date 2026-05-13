/**
 * Sentry 错误上报(后端) — 可选依赖
 * 无 @sentry/node 包或无 SENTRY_DSN 时全部为 no-op
 */

let inited = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryLib: any = null;

function getSentry() {
  if (SentryLib) return SentryLib;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SentryLib = require('@sentry/node');
  } catch {
    SentryLib = null;
  }
  return SentryLib;
}

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (inited) return true;
  const S = getSentry();
  if (!S) return false;

  S.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || process.env.GIT_COMMIT || '0.1.0',
    tracesSampleRate: 0.05,
    beforeSend(event: Record<string, any>) {
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
  const S = getSentry();
  if (!S) return;
  S.withScope((scope: any) => {
    if (ctx) {
      for (const [k, v] of Object.entries(ctx)) {
        if (k === 'user' && v) {
          scope.setUser(v as Record<string, unknown>);
        } else {
          scope.setExtra(k, v);
        }
      }
    }
    S.captureException(err);
  });
}

export function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!inited) return Promise.resolve(true);
  const S = getSentry();
  if (!S) return Promise.resolve(true);
  return S.flush(timeoutMs);
}
