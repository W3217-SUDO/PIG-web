import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('sentry integration', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
    jest.dontMock('@sentry/node');
  });

  it('initializes without printing the DSN value', () => {
    const init = jest.fn();
    jest.doMock('@sentry/node', () => ({ init }));
    process.env.SENTRY_DSN = 'https://public-secret@example.com/123';
    process.env.NODE_ENV = 'production';

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { initSentry } = require('./sentry') as typeof import('./sentry');

    expect(initSentry()).toBe(true);
    const logLine = consoleSpy.mock.calls.flat().join(' ');

    expect(logLine).toContain('Sentry initialized');
    expect(logLine).not.toContain('public-secret');
    expect(logLine).not.toContain(process.env.SENTRY_DSN);
  });

  it('redacts request auth headers before sending events', () => {
    const init = jest.fn();
    jest.doMock('@sentry/node', () => ({ init }));
    process.env.SENTRY_DSN = 'https://public@example.com/123';
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { initSentry } = require('./sentry') as typeof import('./sentry');

    expect(initSentry()).toBe(true);
    const initOptions = init.mock.calls[0][0] as { beforeSend: (event: any) => any };
    const beforeSend = initOptions.beforeSend;
    const event = beforeSend({
      request: {
        headers: {
          Authorization: 'Bearer secret-token',
          Cookie: 'sid=secret-cookie',
          'x-trace-id': 'req_123',
        },
      },
    });

    expect(event.request.headers).toEqual({ 'x-trace-id': 'req_123' });
  });
});
