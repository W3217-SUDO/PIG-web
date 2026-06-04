const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const buildDir = path.join(root, 'frontend', 'dist', 'build', 'mp-weixin');
const expectedAppId = process.env.WX_MP_APPID || 'wx7aaf3180b690e871';
const expectedApiBase = process.env.API_BASE || 'https://www.rockingwei.online/api';
const maxBytes = Number(process.env.MAX_MINIAPP_BYTES || 2 * 1024 * 1024);

const forbidden = [
  /127\.0\.0\.1:3000\/api/i,
  /localhost/i,
  /\/auth\/dev-login/i,
  /\/foster\/auth\/dev-login/i,
  /\/orders\/[^"'\s`]+\/mock-paid/i,
  /mock-paid/i,
  /\/wallet\/topup/i,
  /不校验合法域名/,
  /开发环境直接到账/,
];

const requiredFiles = [
  'app.js',
  'app.json',
  'project.config.json',
  path.join('utils', 'request.js'),
  path.join('utils', 'fosterRequest.js'),
];

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`PASS ${label}`);
  pass += 1;
}

function notOk(label, detail = '') {
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
  fail += 1;
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

if (!fs.existsSync(buildDir)) {
  notOk('mp-weixin build directory exists', buildDir);
  process.exit(1);
}
ok('mp-weixin build directory exists');

for (const rel of requiredFiles) {
  const full = path.join(buildDir, rel);
  if (fs.existsSync(full)) ok(`required file ${rel}`);
  else notOk(`required file ${rel}`);
}

let projectConfig = null;
try {
  projectConfig = JSON.parse(fs.readFileSync(path.join(buildDir, 'project.config.json'), 'utf8'));
  ok('project.config.json parses');
} catch (err) {
  notOk('project.config.json parses', err.message);
}

if (projectConfig) {
  if (projectConfig.appid === expectedAppId) ok(`appid is ${expectedAppId}`);
  else notOk('appid matches expected appid', `got ${projectConfig.appid || '(empty)'}`);

  if (projectConfig.setting?.urlCheck === true) ok('urlCheck is true');
  else notOk('urlCheck is true', `got ${projectConfig.setting?.urlCheck}`);
}

const files = walk(buildDir);
let totalBytes = 0;
const hits = [];

for (const file of files) {
  const stat = fs.statSync(file);
  totalBytes += stat.size;
  if (!isTextFile(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    const match = content.match(pattern);
    if (match) {
      hits.push({
        file: path.relative(root, file),
        pattern: pattern.toString(),
        match: match[0].slice(0, 120),
      });
    }
  }
}

if (hits.length === 0) ok('forbidden dev/test endpoints are absent');
else {
  for (const hit of hits.slice(0, 20)) {
    notOk('forbidden dev/test endpoint found', `${hit.file} ${hit.pattern} -> ${hit.match}`);
  }
  if (hits.length > 20) notOk('additional forbidden hits', `${hits.length - 20} more`);
}

const requestJs = fs.readFileSync(path.join(buildDir, 'utils', 'request.js'), 'utf8');
const fosterRequestJs = fs.readFileSync(path.join(buildDir, 'utils', 'fosterRequest.js'), 'utf8');
if (requestJs.includes(expectedApiBase)) ok('utils/request.js uses production API base');
else notOk('utils/request.js uses production API base');
if (fosterRequestJs.includes(expectedApiBase)) ok('utils/fosterRequest.js uses production API base');
else notOk('utils/fosterRequest.js uses production API base');

if (totalBytes > 0 && totalBytes <= maxBytes) {
  ok(`package size ${Math.round(totalBytes / 1024)}KB <= ${Math.round(maxBytes / 1024)}KB`);
} else {
  notOk('package size within limit', `${totalBytes} bytes > ${maxBytes} bytes`);
}

console.log();
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);

if (fail > 0) process.exit(1);
