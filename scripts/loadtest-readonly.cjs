#!/usr/bin/env node
const http = require('node:http');
const https = require('node:https');
const { performance } = require('node:perf_hooks');

const BASE = (process.env.BASE || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const RPS = numberEnv('RPS', 5);
const DURATION_SECONDS = numberEnv('DURATION_SECONDS', 15);
const P95_LIMIT_MS = numberEnv('P95_LIMIT_MS', 1000);
const ERROR_RATE_LIMIT = numberEnv('ERROR_RATE_LIMIT', 0.01);

const agents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: Math.max(32, RPS * 2) }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: Math.max(32, RPS * 2) }),
};

function numberEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return n;
}

function request(path) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE}${path}`);
    const started = performance.now();
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(
      url,
      {
        method: 'GET',
        timeout: 8000,
        agent: agents[url.protocol],
        headers: { 'User-Agent': 'pig-readonly-loadtest/1.0' },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({
            path,
            status: res.statusCode || 0,
            ms: performance.now() - started,
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => {
      resolve({
        path,
        status: 0,
        ms: performance.now() - started,
        error: err.message,
      });
    });
    req.end();
  });
}

async function getPigId() {
  const body = await new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/pigs?pageSize=1`);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, { method: 'GET', timeout: 8000, agent: agents[url.protocol] }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        text += chunk;
      });
      res.on('end', () => resolve(text));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
  const parsed = JSON.parse(body);
  const data = parsed.data || parsed;
  return data.items?.[0]?.id || null;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function expectedStatus(result) {
  return result.status >= 200 && result.status < 300;
}

async function main() {
  console.log('PIG readonly loadtest');
  console.log(`Base: ${BASE}`);
  console.log(`Target: ${RPS} RPS for ${DURATION_SECONDS}s`);
  console.log(`Gate: p95 <= ${P95_LIMIT_MS}ms, error_rate <= ${(ERROR_RATE_LIMIT * 100).toFixed(2)}%`);

  let pigId = null;
  try {
    pigId = await getPigId();
  } catch (err) {
    console.error(`Failed to fetch pig id: ${err.message}`);
  }
  if (!pigId) {
    console.error('No pig id found from /pigs?pageSize=1; aborting readonly loadtest.');
    process.exit(1);
  }

  const paths = [
    '/health',
    '/pigs?pageSize=5',
    `/pigs/${pigId}`,
    `/pigs/${pigId}/timeline`,
  ];

  const totalTarget = RPS * DURATION_SECONDS;
  const intervalMs = 1000 / RPS;
  const results = [];
  const started = performance.now();
  const pending = new Set();

  for (let i = 0; i < totalTarget; i += 1) {
    const due = started + i * intervalMs;
    const wait = due - performance.now();
    if (wait > 0) await sleep(wait);

    const path = paths[i % paths.length];
    const p = request(path).then((result) => {
      results.push(result);
      pending.delete(p);
    });
    pending.add(p);

    if ((i + 1) % Math.max(RPS * 10, 1) === 0) {
      printProgress(results, totalTarget);
    }
  }

  await Promise.all(pending);
  const elapsedSeconds = (performance.now() - started) / 1000;
  const latencies = results.map((r) => r.ms);
  const failures = results.filter((r) => !expectedStatus(r));
  const errorRate = results.length ? failures.length / results.length : 1;
  const summary = {
    requests: results.length,
    target_requests: totalTarget,
    elapsed_seconds: Number(elapsedSeconds.toFixed(2)),
    achieved_rps: Number((results.length / elapsedSeconds).toFixed(2)),
    failures: failures.length,
    error_rate: Number(errorRate.toFixed(4)),
    min_ms: Number(Math.min(...latencies).toFixed(1)),
    avg_ms: Number((latencies.reduce((sum, n) => sum + n, 0) / latencies.length).toFixed(1)),
    p50_ms: Number(percentile(latencies, 50).toFixed(1)),
    p95_ms: Number(percentile(latencies, 95).toFixed(1)),
    p99_ms: Number(percentile(latencies, 99).toFixed(1)),
    max_ms: Number(Math.max(...latencies).toFixed(1)),
  };

  console.log('\nSummary');
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length) {
    console.log('\nFailure samples');
    for (const sample of failures.slice(0, 10)) {
      console.log(JSON.stringify(sample));
    }
  }

  if (summary.p95_ms > P95_LIMIT_MS || errorRate > ERROR_RATE_LIMIT) {
    console.error('\nReadonly loadtest failed gate.');
    process.exit(1);
  }

  console.log('\nReadonly loadtest passed gate.');
}

function printProgress(results, totalTarget) {
  const failures = results.filter((r) => !expectedStatus(r)).length;
  const p95 = percentile(results.map((r) => r.ms), 95).toFixed(1);
  console.log(`progress ${results.length}/${totalTarget} failures=${failures} p95=${p95}ms`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
