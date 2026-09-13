const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('  Starting BendLens Desktop Studio (Native Window)');
console.log('========================================================');

// Launch Electron Native Window immediately.
// Electron's main process displays the instant splash screen (<50ms)
// and handles background server initialization concurrently.
const fs = require('fs');
const projectRoot = path.join(__dirname, '..');
const hasPnpm = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
const runner = hasPnpm ? 'pnpm' : 'npx';
const runnerArgs = hasPnpm ? ['exec', 'electron', '.'] : ['electron', '.'];

console.log(`[*] Launching BendLens Native Desktop Window via ${runner}...`);
const electronProcess = spawn(runner, runnerArgs, {
  cwd: projectRoot,
  shell: true,
  stdio: 'inherit'
});

electronProcess.on('close', () => {
  console.log('[*] BendLens Desktop closed.');
  process.exit(0);
});
