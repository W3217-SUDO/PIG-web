const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const workflowPath = path.join(root, '.github', 'workflows', 'ci.yml');
const content = fs.readFileSync(workflowPath, 'utf8');
const lines = content.split(/\r?\n/);

const requiredHardSteps = [
  'backend build',
  'frontend type-check',
  'frontend sentry sanitizer test',
  'health alert webhook test',
  'miniapp build audit',
  'backend unit tests',
  'backend e2e',
];

const failures = [];

function lineIndent(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/['"]/g, '').trim();
}

function findStep(nameNeedle) {
  const normalizedNeedle = nameNeedle.toLowerCase();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^\s*-\s+name:\s*(.+?)\s*$/);
    if (!match) continue;

    const name = normalizeName(match[1]);
    if (!name.includes(normalizedNeedle)) continue;

    const indent = lineIndent(line);
    const block = [line];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (/^\s*-\s+name:\s*/.test(next) && lineIndent(next) <= indent) break;
      if (/^\s+[a-zA-Z0-9_-]+:\s*$/.test(next) && lineIndent(next) < indent) break;
      block.push(next);
    }

    return { line: i + 1, name: match[1].trim(), block: block.join('\n') };
  }

  return null;
}

for (const stepName of requiredHardSteps) {
  const step = findStep(stepName);
  if (!step) {
    failures.push(`missing required hard CI step: ${stepName}`);
    continue;
  }

  if (/continue-on-error:\s*true/.test(step.block)) {
    failures.push(`${step.name} uses continue-on-error at line ${step.line}`);
  }

  if (/\|\|\s*(true|echo\b)/.test(step.block)) {
    failures.push(`${step.name} swallows command failure with || at line ${step.line}`);
  }
}

if (failures.length > 0) {
  console.error('FAIL CI workflow hard-gate audit');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS CI workflow hard-gate audit (${requiredHardSteps.length} required hard steps)`);
