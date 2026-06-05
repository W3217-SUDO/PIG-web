const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const failures = [];

function readWorkspacePackage(name) {
  const pkgPath = path.join(root, name, 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

const workspacePackages = {
  frontend: readWorkspacePackage('frontend'),
  backend: readWorkspacePackage('backend'),
};

for (const [scriptName, command] of Object.entries(rootPkg.scripts || {})) {
  const match = command.match(/^npm -w (frontend|backend) run ([^\s]+)/);
  if (!match) continue;

  const [, workspace, workspaceScript] = match;
  const scripts = workspacePackages[workspace].scripts || {};
  if (!scripts[workspaceScript]) {
    failures.push(`${scriptName} calls missing ${workspace} script: ${workspaceScript}`);
  }
}

if (failures.length > 0) {
  console.error('FAIL workspace script contract audit');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS workspace script contract audit');
