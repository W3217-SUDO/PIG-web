const assert = require('node:assert/strict');
require('ts-node/register');

const { sanitizeSentryRequestHeaders } = require('../frontend/src/utils/sentrySanitize');

const headers = sanitizeSentryRequestHeaders({
  Authorization: 'Bearer secret-token',
  Cookie: 'sid=secret-cookie',
  'x-trace-id': 'req_123',
});

assert.deepEqual(headers, { 'x-trace-id': 'req_123' });
console.log('PASS frontend sentry header sanitizer');
