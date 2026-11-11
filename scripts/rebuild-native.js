const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findPython311() {
  const dirs = (process.env.PATH || '').split(':').concat(['/opt/homebrew/bin', '/usr/local/bin']);
  for (const dir of dirs) {
    const candidate = path.join(dir, 'python3.11');
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const python = findPython311();
if (!python) {
  console.error('The native driver needs Python 3.11. Python 3.12 and newer removed distutils, which node-gyp still requires.');
  console.error('Install it with: brew install python@3.11');
  process.exit(1);
}

const nodeGyp = path.join(__dirname, '../node_modules/.bin/node-gyp');
const result = spawnSync(nodeGyp, [
  'rebuild',
  '--target=11.5.0',
  '--arch=' + process.arch,
  '--dist-url=https://electronjs.org/headers',
  '--openssl_fips=',
], {
  stdio: 'inherit',
  env: Object.assign({}, process.env, { PYTHON: python }),
});

process.exit(result.status == null ? 1 : result.status);
