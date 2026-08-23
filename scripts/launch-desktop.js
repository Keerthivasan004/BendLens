const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('  Starting BendLens Desktop Studio (Native Window)');
console.log('========================================================');

// Check if dev server is running
const checkAndLaunch = () => {
  http
    .get('http://localhost:3000', (res) => {
      console.log('[*] Backend engine active on http://localhost:3000');
      launchElectron();
    })
    .on('error', () => {
      console.log('[*] Starting local Next.js engine...');
      const server = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        shell: true,
        stdio: 'inherit'
      });

      // Poll until ready
      const interval = setInterval(() => {
        http
          .get('http://localhost:3000', (r) => {
            clearInterval(interval);
            launchElectron();
          })
          .on('error', () => {});
      }, 500);
    });
};

function launchElectron() {
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
}

checkAndLaunch();
