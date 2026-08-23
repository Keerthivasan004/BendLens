const { spawn } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 Starting BendLens - Backend Architecture & Impact Platform');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const nextProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (err) => {
  console.error('Failed to start BendLens:', err);
});
