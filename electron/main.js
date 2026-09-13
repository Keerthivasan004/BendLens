const { app, BrowserWindow, shell, Notification, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let activePort = 3000;
const HOST = '127.0.0.1';
const PORT_CANDIDATES = [3000, 3001, 3030, 8000, 5000];
const appUrl = () => `http://${HOST}:${activePort}`;

app.setAppUserModelId('com.bendlens.studio');

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

/**
 * Resolve the directory that hosts the Next.js engine.
 * Packaged app  -> <resources>/app (asar disabled for reliable fs/cwd behavior).
 * Dev workspace -> repository root (parent of electron/).
 */
function resolveAppDir() {
  if (app.isPackaged) {
    const resApp = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(path.join(resApp, 'package.json'))) return resApp;
    const asarApp = path.join(process.resourcesPath, 'app.asar');
    if (fs.existsSync(asarApp)) return asarApp;
    return resApp;
  }
  return path.join(__dirname, '..');
}

/**
 * Identity probe: is the server on this port actually BendLens?
 * Prevents attaching to an unrelated service squatting on port 3000.
 */
function isBendLensServer(port, callback) {
  const req = http.get({ host: HOST, port, path: '/api/updates/check', timeout: 800 }, (res) => {
    let data = '';
    res.on('data', (c) => {
      data += c;
      if (data.length > 65536) req.destroy();
    });
    res.on('end', () => {
      try {
        const info = JSON.parse(data);
        callback(info && info.success === true && typeof info.currentVersion === 'string');
      } catch {
        callback(false);
      }
    });
  });
  req.on('error', () => callback(false));
  req.on('timeout', () => {
    req.destroy();
    callback(false);
  });
}

function isPortFree(port, callback) {
  const socket = net.connect(port, HOST);
  let done = false;
  const finish = (free) => {
    if (!done) {
      done = true;
      socket.destroy();
      callback(free);
    }
  };
  socket.on('connect', () => finish(false));
  socket.on('error', () => finish(true));
  socket.setTimeout(500, () => finish(true));
}

/**
 * Pick a port: reuse a live BendLens server, else first free candidate.
 * done(port, shouldSpawn)
 */
function resolvePort(done, idx = 0) {
  if (idx >= PORT_CANDIDATES.length) {
    done(3000, true);
    return;
  }
  const port = PORT_CANDIDATES[idx];
  isBendLensServer(port, (isOurs) => {
    if (isOurs) {
      console.log(`[*] Reusing live BendLens engine on port ${port}.`);
      done(port, false);
      return;
    }
    isPortFree(port, (free) => {
      if (free) done(port, true);
      else resolvePort(done, idx + 1);
    });
  });
}

/**
 * Start the embedded Next.js engine. Returns true when a spawn was attempted.
 * Packaged mode uses Electron's own Node runtime + bundled Next — no npm needed.
 */
function startBackendServer(projectDir, port) {
  if (serverProcess) return true;

  if (app.isPackaged) {
    const nextBin = path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!fs.existsSync(nextBin)) {
      console.error('[!] Packaged engine missing bundled Next.js:', nextBin);
      dialog.showErrorBox(
        'BendLens Engine Missing',
        'The embedded BendLens engine could not be found in this installation.\n\nPlease reinstall BendLens from the official installer.'
      );
      return false;
    }
    console.log(`[*] Spawning embedded BendLens engine (production) on port ${port}...`);
    serverProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(port), '-H', HOST], {
      cwd: projectDir,
      windowsHide: true,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(port), HOSTNAME: HOST }
    });
  } else {
    const isWin = process.platform === 'win32';
    const hasPnpm = fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'));
    const pmCmd = hasPnpm ? (isWin ? 'pnpm.cmd' : 'pnpm') : (isWin ? 'npm.cmd' : 'npm');

    const hasBuild = fs.existsSync(path.join(projectDir, '.next'));
    const startScript = hasBuild ? 'start' : 'dev';
    console.log(`[*] Spawning BendLens local engine via ${hasPnpm ? 'pnpm' : 'npm'} (${hasBuild ? 'PRODUCTION fast-mode' : 'DEV mode'}) on port ${port}...`);

    serverProcess = spawn(pmCmd, ['run', startScript], {
      cwd: projectDir,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: String(port) }
    });
  }

  serverProcess.stdout?.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Ready in') || text.includes('ready started') || text.includes('compiled client and server')) {
      console.log('[*] Engine ready signal received.');
    }
  });
  serverProcess.stderr?.on('data', (data) => {
    console.error('[engine]', data.toString().trim());
  });
  serverProcess.on('error', (err) => {
    console.error('[!] Failed to spawn BendLens engine:', err);
    serverProcess = null;
  });
  serverProcess.on('exit', (code) => {
    console.log(`[*] Engine process exited (code ${code}).`);
    serverProcess = null;
  });
  return true;
}

function initBackendAndConnect() {
  const projectDir = resolveAppDir();

  resolvePort((port, shouldSpawn) => {
    activePort = port;
    if (!shouldSpawn) {
      loadStudio();
      return;
    }
    if (!startBackendServer(projectDir, port)) return;

    // Poll BendLens identity (not just TCP) before leaving the splash screen
    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      isBendLensServer(activePort, (ready) => {
        if (ready) {
          clearInterval(pollInterval);
          loadStudio();
        } else if (attempts > 130) { // ~20s timeout
          clearInterval(pollInterval);
          console.error('[!] Engine did not become ready in time.');
          dialog.showErrorBox(
            'BendLens Engine Failed to Start',
            'The local BendLens engine did not respond in time.\n\nPlease restart the application. If the problem persists, reinstall BendLens.'
          );
        }
      });
    }, 150);
  });
}

function loadStudio() {
  if (!mainWindow) return;
  mainWindow.loadURL(appUrl()).then(() => {
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
    .get(`${appUrl()}/api/updates/check`, (res) => {
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
