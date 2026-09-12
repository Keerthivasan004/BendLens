const { app, BrowserWindow, shell, Notification } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const APP_URL = `http://127.0.0.1:${PORT}`;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'BendLens - Universal Backend Architecture & Blast Platform',
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../public/icon.ico')
      : path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: true
  });

  // 1. Instantly load the high-performance local splash screen (<50ms)
  const splashPath = path.join(__dirname, 'splash.html');
  if (fs.existsSync(splashPath)) {
    mainWindow.loadFile(splashPath);
  }

  // 2. Initialize and connect to the BendLens engine
  initBackendAndConnect();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupServer();
  });
}

function checkServerReady(callback) {
  const req = http.get(APP_URL, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      callback(true);
    } else {
      callback(false);
    }
  });

  req.on('error', () => {
    callback(false);
  });

  req.setTimeout(600, () => {
    req.destroy();
    callback(false);
  });
}

function startBackendServer(projectDir) {
  if (serverProcess) return;

  const isWin = process.platform === 'win32';
  const npmCmd = isWin ? 'npm.cmd' : 'npm';
  
  // Smart detection: Use ultra-fast production mode ('next start') if build exists
  const nextBuildPath = path.join(projectDir, '.next');
  const hasBuild = fs.existsSync(nextBuildPath);
  const startScript = hasBuild ? 'start' : 'dev';

  console.log(`[*] Spawning BendLens local engine (${hasBuild ? 'PRODUCTION fast-mode' : 'DEV mode'})...`);

  serverProcess = spawn(npmCmd, ['run', startScript], {
    cwd: projectDir,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) }
  });

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Ready in') || text.includes('ready started') || text.includes('compiled client and server')) {
      console.log('[*] Engine ready signal received.');
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[!] Failed to spawn BendLens engine:', err);
  });
}

function initBackendAndConnect() {
  const projectDir = path.join(__dirname, '..');

  // Check if server is already running
  checkServerReady((isAlive) => {
    if (isAlive) {
      // Server is already live - immediate transition!
      loadStudio();
    } else {
      // Start backend engine
      startBackendServer(projectDir);

      // Fast-poll readiness at 120ms intervals
      let attempts = 0;
      const pollInterval = setInterval(() => {
        attempts++;
        checkServerReady((ready) => {
          if (ready) {
            clearInterval(pollInterval);
            loadStudio();
          } else if (attempts > 120) { // ~15s timeout
            clearInterval(pollInterval);
            if (mainWindow) {
              mainWindow.loadURL(APP_URL).catch(() => {});
            }
          }
        });
      }, 120);
    }
  });
}

function loadStudio() {
  if (!mainWindow) return;
  mainWindow.loadURL(APP_URL).then(() => {
    checkForDesktopUpdates();
  }).catch((err) => {
    console.error('[!] Error loading studio URL:', err);
  });
}

function cleanupServer() {
  if (serverProcess && serverProcess.pid) {
    console.log('[*] Cleaning up background engine process...');
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${serverProcess.pid} /t /f`, () => {});
    } else {
      try {
        process.kill(-serverProcess.pid);
      } catch {
        serverProcess.kill('SIGTERM');
      }
    }
    serverProcess = null;
  }
}

// Background Auto-Update Check
function checkForDesktopUpdates() {
  http
    .get(`${APP_URL}/api/updates/check`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const info = JSON.parse(data);
          if (info.hasUpdate) {
            if (Notification.isSupported()) {
              new Notification({
                title: 'BendLens Auto-Update Available',
                body: `Version v${info.latestVersion} is ready to install with 1-click.`,
                icon: path.join(__dirname, '../public/icon.png')
              }).show();
            }
          }
        } catch {}
      });
    })
    .on('error', () => {});
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  cleanupServer();
});

app.on('window-all-closed', () => {
  cleanupServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
