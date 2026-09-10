const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('  Starting BendLens Desktop Studio (Native Window)');
console.log('========================================================');

// Launch Electron Native Window immediately.
// Electron's main process displays the instant splash screen (<50ms)
// and handles background server initialization concurrently.
console.log('[*] Launching BendLens Native Desktop Window...');
const electronProcess = spawn('npx', ['electron', '.'], {
  cwd: path.join(__dirname, '..'),
  shell: true,
  stdio: 'inherit'
});

electronProcess.on('close', () => {
  console.log('[*] BendLens Desktop closed.');
  process.exit(0);
});
