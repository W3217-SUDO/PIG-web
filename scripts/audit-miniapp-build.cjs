const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();
const buildDir = path.join(root, 'frontend', 'dist', 'build', 'mp-weixin');
const artifactDir = path.join(root, 'artifacts');
const expectedAppId = process.env.WX_MP_APPID || 'wx7aaf3180b690e871';
const expectedApiBase = process.env.API_BASE || 'https://www.rockingwei.online/api';
const maxBytes = Number(process.env.MAX_MINIAPP_BYTES || 2 * 1024 * 1024);

const forbidden = [
  { label: 'local backend API', pattern: /127\.0\.0\.1:3000\/api/i },
  { label: 'localhost', pattern: /localhost/i },
  { label: 'customer dev login', pattern: /\/auth\/dev-login/i },
  { label: 'farmer dev login', pattern: /\/foster\/auth\/dev-login/i },
  { label: 'order mock paid endpoint', pattern: /\/orders\/[^"'\s`]+\/mock-paid/i },
  { label: 'mock paid marker', pattern: /mock-paid/i },
  { label: 'wallet topup endpoint', pattern: /\/wallet\/topup/i },
  { label: 'disabled legal domain check text', pattern: /不校验合法域名/ },
  { label: 'dev direct wallet credit text', pattern: /开发环境直接到账/ },
];

const requiredFiles = [
  'app.js',
  'app.json',
  'project.config.json',
  path.join('utils', 'request.js'),
  path.join('utils', 'fosterRequest.js'),
];

const checks = [];

function check(label, passed, detail = '') {
  checks.push({ label, passed, detail });
  const prefix = passed ? 'PASS' : 'FAIL';
  const stream = passed ? console.log : console.error;
  stream(`${prefix} ${label}${detail ? `: ${detail}` : ''}`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isTextFile(file) {
  return /\.(js|json|wxml|wxss|css|html|txt|map)$/i.test(file);
}

function gitCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function writeReports(summary) {
  fs.mkdirSync(artifactDir, { recursive: true });

  const jsonPath = path.join(artifactDir, 'miniapp-audit.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

  const lines = [
    '# Miniapp Build Audit',
    '',
    `- Time: ${summary.generated_at}`,
    `- Commit: ${summary.commit}`,
    `- Build dir: \`${path.relative(root, summary.build_dir)}\``,
    `- AppID: \`${summary.appid || '(missing)'}\``,
    `- API base: \`${summary.expected_api_base}\``,
    `- URL check: \`${summary.url_check}\``,
    `- Package size: ${Math.round(summary.total_bytes / 1024)} KB / ${Math.round(summary.max_bytes / 1024)} KB`,
    `- Files: ${summary.file_count}`,
    `- Result: ${summary.fail_count === 0 ? 'PASS' : 'FAIL'} (${summary.pass_count} pass / ${summary.fail_count} fail)`,
    '',
    '## Checks',
    '',
    '| Result | Check | Detail |',
    '| --- | --- | --- |',
    ...summary.checks.map((item) => {
      const result = item.passed ? 'PASS' : 'FAIL';
      const detail = String(item.detail || '').replace(/\|/g, '\\|');
      return `| ${result} | ${item.label.replace(/\|/g, '\\|')} | ${detail} |`;
    }),
    '',
  ];

  const mdPath = path.join(artifactDir, 'miniapp-audit.md');
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);

  console.log();
  console.log(`Wrote ${path.relative(root, jsonPath)}`);
  console.log(`Wrote ${path.relative(root, mdPath)}`);
}

let projectConfig = null;
let files = [];
let totalBytes = 0;
const hits = [];

check('mp-weixin build directory exists', fs.existsSync(buildDir), path.relative(root, buildDir));

if (fs.existsSync(buildDir)) {
  for (const rel of requiredFiles) {
    const full = path.join(buildDir, rel);
    check(`required file ${rel}`, fs.existsSync(full));
  }

  try {
    projectConfig = JSON.parse(fs.readFileSync(path.join(buildDir, 'project.config.json'), 'utf8'));
    check('project.config.json parses', true);
  } catch (err) {
    check('project.config.json parses', false, err.message);
  }

  if (projectConfig) {
    check(
      `appid is ${expectedAppId}`,
      projectConfig.appid === expectedAppId,
      projectConfig.appid === expectedAppId ? '' : `got ${projectConfig.appid || '(empty)'}`,
    );

    check(
      'urlCheck is true',
      projectConfig.setting?.urlCheck === true,
      projectConfig.setting?.urlCheck === true ? '' : `got ${projectConfig.setting?.urlCheck}`,
    );
  }

  files = walk(buildDir);

  for (const file of files) {
    const stat = fs.statSync(file);
    totalBytes += stat.size;
    if (!isTextFile(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const forbiddenItem of forbidden) {
      const match = content.match(forbiddenItem.pattern);
      if (match) {
        hits.push({
          file: path.relative(root, file),
          label: forbiddenItem.label,
          pattern: forbiddenItem.pattern.toString(),
          match: match[0].slice(0, 120),
        });
      }
    }
  }

  if (hits.length === 0) {
    check('forbidden dev/test endpoints are absent', true);
  } else {
    for (const hit of hits.slice(0, 20)) {
      check('forbidden dev/test endpoint found', false, `${hit.file} ${hit.label} -> ${hit.match}`);
    }
    if (hits.length > 20) check('additional forbidden hits', false, `${hits.length - 20} more`);
  }

  const requestJsPath = path.join(buildDir, 'utils', 'request.js');
  const fosterRequestJsPath = path.join(buildDir, 'utils', 'fosterRequest.js');
  const requestJs = fs.existsSync(requestJsPath) ? fs.readFileSync(requestJsPath, 'utf8') : '';
  const fosterRequestJs = fs.existsSync(fosterRequestJsPath) ? fs.readFileSync(fosterRequestJsPath, 'utf8') : '';

  check('utils/request.js uses production API base', requestJs.includes(expectedApiBase));
  check('utils/fosterRequest.js uses production API base', fosterRequestJs.includes(expectedApiBase));

  check(
    `package size ${Math.round(totalBytes / 1024)}KB <= ${Math.round(maxBytes / 1024)}KB`,
    totalBytes > 0 && totalBytes <= maxBytes,
    totalBytes > maxBytes ? `${totalBytes} bytes > ${maxBytes} bytes` : '',
  );
}

const passCount = checks.filter((item) => item.passed).length;
const failCount = checks.length - passCount;
const summary = {
  generated_at: new Date().toISOString(),
  commit: gitCommit(),
  build_dir: buildDir,
  build_dir_relative: path.relative(root, buildDir),
  appid: projectConfig?.appid || null,
  expected_appid: expectedAppId,
  expected_api_base: expectedApiBase,
  url_check: projectConfig?.setting?.urlCheck ?? null,
  total_bytes: totalBytes,
  max_bytes: maxBytes,
  file_count: files.length,
  forbidden_hit_count: hits.length,
  forbidden_hits: hits,
  pass_count: passCount,
  fail_count: failCount,
  checks,
};

console.log();
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);

writeReports(summary);

if (failCount > 0) process.exit(1);
