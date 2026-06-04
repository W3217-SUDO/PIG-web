const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-bash.cjs <script> [args...]');
  process.exit(2);
}

const candidates = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      'bash',
    ]
  : ['bash'];

const bash = candidates.find((candidate) => candidate === 'bash' || existsSync(candidate));
const result = spawnSync(bash || 'bash', [script, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
