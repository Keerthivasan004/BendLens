const { app, BrowserWindow, shell, Notification, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const net = require('net');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let serverProcess = null;
let activePort = 3000;
let studioLoaded = false;
let studioLoading = false;
const HOST = '127.0.0.1';
const PORT_CANDIDATES = [3000, 3001, 3030, 8000, 5000];
const appUrl = () => `http://${HOST}:${activePort}`;

app.setAppUserModelId('com.bendlens.studio');

// High-performance GPU hardware acceleration and render pipeline switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-hardware-overlays');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Re-download / double-launch case: BendLens is already installed and
    // running — never boot a second engine (it would fight over ports and
    // look "not working"). Just bring the existing studio window forward.
    if (mainWindow) {
      try {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
      } catch {}
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
    icon: resolveWindowIcon(),
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false,
      enableWebSQL: false
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

  // Ensure downloads never block the UI thread or freeze the cursor
  try {
    mainWindow.webContents.session.on('will-download', (event, item) => {
      item.once('done', (e, state) => {
        if (state === 'completed') {
          console.log('[*] Desktop download completed smoothly:', item.getFilename());
        }
      });
    });
  } catch {}

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupServer();
  });
}

/**
 * Resolve the best window/taskbar icon for this runtime.
 * Handles: dev workspace, packaged resources/app (asar disabled),
 * legacy app.asar builds, asar.unpacked icons, and extraResources.
 * Returns undefined when nothing is found (Electron falls back safely).
 */
function resolveWindowIcon() {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'public', iconFile));
    candidates.push(path.join(process.resourcesPath, 'app', 'public', iconFile));
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'public', iconFile));
  }
  candidates.push(path.join(__dirname, '..', 'public', iconFile));
  candidates.push(path.join(__dirname, 'public', iconFile));
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {}
  }
  return undefined;
}

/**
 * Resolve the directory that hosts the Next.js engine.
 * Packaged app  -> <resources>/app (asar disabled for reliable fs/cwd behavior).
 * Dev workspace -> repository root (parent of electron/).
 * Handles the case where electron-builder creates app.asar despite asar:false config.
 */
function resolveAppDir() {
  if (app.isPackaged) {
    // 1. First priority: unpacked app directory (expected when asar: false)
    const resApp = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(path.join(resApp, 'package.json'))) return resApp;

    // 2. Second priority: app.asar.unpacked directory (created by electron-builder for asarUnpack)
    const asarUnpacked = path.join(process.resourcesPath, 'app.asar.unpacked');
    if (fs.existsSync(path.join(asarUnpacked, 'package.json'))) return asarUnpacked;

    // 3. Third priority: if only app.asar exists, we need to extract it to a temp location
    //    because fs operations don't work directly on asar files
    const asarApp = path.join(process.resourcesPath, 'app.asar');
    if (fs.existsSync(asarApp)) {
      // Extract asar to a temporary directory for runtime access.
      // Version-guarded: a re-downloaded (new-version) install must NEVER
      // reuse the previous version's extracted files — that mismatch is what
      // left reinstalled apps "not working properly".
      const tempAppDir = path.join(app.getPath('userData'), 'extracted-app');
      const cachedVersion = clearStaleExtractedApp(tempAppDir);
      const currentVersion = getRunningVersion();

      // Skip extraction if already extracted for this version (prevents 2hr+ re-extraction on every launch)
      if (cachedVersion === currentVersion && fs.existsSync(path.join(tempAppDir, 'package.json'))) {
        console.log('[*] Using cached extracted engine (v' + currentVersion + ')');
        return tempAppDir;
      }

      if (!fs.existsSync(path.join(tempAppDir, 'package.json'))) {
        try {
          const asar = require('asar');
          if (fs.existsSync(tempAppDir)) {
            fs.rmSync(tempAppDir, { recursive: true, force: true });
          }
          fs.mkdirSync(tempAppDir, { recursive: true });
          console.log('[*] Extracting app.asar (this may take a minute on first launch)...');
          const extractStart = Date.now();
          asar.extractAll(asarApp, tempAppDir);
          console.log('[*] Extracted app.asar to:', tempAppDir, 'in', (Date.now() - extractStart) / 1000, 'seconds');
          stampExtractedApp(tempAppDir);
        } catch (err) {
          console.error('[!] Failed to extract app.asar:', err.message);
        }
      }
      if (fs.existsSync(path.join(tempAppDir, 'package.json'))) {
        return tempAppDir;
      }
      // Fallback: return asar path anyway (will cause errors but lets caller handle it)
      return asarApp;
    }

    return resApp;
  }
  return path.join(__dirname, '..');
}

/**
 * Current install version (package.json). Used to invalidate stale caches
 * (extracted-app) and to avoid attaching a re-downloaded build to an old
 * running engine of a different version.
 */
function getRunningVersion() {
  try {
    return app.getVersion() || null;
  } catch {
    return null;
  }
}

/**
 * Remove a stale asar-extraction cache from a previous version.
 * The marker file <userData>/extracted-app.version records which version
 * was extracted; a mismatch means the files no longer match this install.
 */
function clearStaleExtractedApp(tempAppDir) {
  try {
    const marker = path.join(path.dirname(tempAppDir), 'extracted-app.version');
    const current = getRunningVersion();
    let stamped = null;
    try {
      if (fs.existsSync(marker)) stamped = fs.readFileSync(marker, 'utf-8').trim() || null;
    } catch {}
    if (stamped && current && stamped !== current) {
      console.log(`[*] Removing stale extracted engine (v${stamped} -> v${current}).`);
      try {
        fs.rmSync(tempAppDir, { recursive: true, force: true });
      } catch {}
      try {
        fs.unlinkSync(marker);
      } catch {}
    }
    return stamped;
  } catch {
    return null;
  }
}

function stampExtractedApp(tempAppDir) {
  try {
    const current = getRunningVersion();
    if (!current) return;
    fs.writeFileSync(path.join(path.dirname(tempAppDir), 'extracted-app.version'), current, 'utf-8');
  } catch {}
}

/**
 * Identity probe: is the server on this port actually BendLens?
 * Prevents attaching to an unrelated service squatting on port 3000.
 * callback(isOurs:boolean, serverVersion:string|null).
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
        if (info && info.success === true && typeof info.currentVersion === 'string') {
          callback(true, info.currentVersion);
        } else {
          callback(false, null);
        }
      } catch {
        callback(false, null);
      }
    });
  });
  req.on('error', () => callback(false, null));
  req.on('timeout', () => {
    req.destroy();
    callback(false, null);
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
 * Pick a port: reuse a live BendLens server ONLY when its version matches
 * this install, else first free candidate. Re-downloaded builds used to
 * attach to an older running engine (stale code, broken UI); now a version
 * mismatch is skipped so the new build boots its own engine.
 * done(port, shouldSpawn)
 */
function resolvePort(done, idx = 0) {
  if (idx >= PORT_CANDIDATES.length) {
    done(3000, true);
    return;
  }
  const port = PORT_CANDIDATES[idx];
  isBendLensServer(port, (isOurs, serverVersion) => {
    if (isOurs) {
      const mine = getRunningVersion();
      if (!mine || !serverVersion || serverVersion === mine) {
        console.log(`[*] Reusing live BendLens engine on port ${port}.`);
        done(port, false);
        return;
      }
      console.log(`[*] Live engine on port ${port} is v${serverVersion}, this install is v${mine} — starting a fresh engine.`);
      resolvePort(done, idx + 1);
      return;
    }
    isPortFree(port, (free) => {
      if (free) done(port, true);
      else resolvePort(done, idx + 1);
    });
  });
}

/**
 * Detect duplicate BendLens installations on this machine.
 * Download-again users often end up with two copies: the NSIS install
 * (%LOCALAPPDATA%\Programs\BendLens) plus the legacy CMD payload
 * (%LOCALAPPDATA%\BendLens) or a stray portable. Booting the stale copy is
 * what made re-downloads "not work properly". This logs the situation and —
 * once per version — tells the user which copy is active so they can remove
 * the other via its uninstaller (which now wipes all app data).
 */
function detectDuplicateInstalls(projectDir) {
  try {
    if (!app.isPackaged || process.platform !== 'win32') return;
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || '';
    const candidates = [];
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Programs', 'BendLens'));
      candidates.push(path.join(localAppData, 'BendLens'));
    }
    if (programFiles) candidates.push(path.join(programFiles, 'BendLens'));
    const norm = (p) => {
      try {
        return path.resolve(p).toLowerCase();
      } catch {
        return String(p).toLowerCase();
      }
    };
    const active = norm(projectDir);
    const others = candidates.filter((c) => {
      try {
        return norm(c) !== active && fs.existsSync(path.join(c, 'package.json'));
      } catch {
        return false;
      }
    });
    // A portable copy next to the running exe counts as a duplicate too.
    try {
      const exeDir = path.dirname(process.execPath || '');
      if (exeDir && norm(exeDir) !== active && fs.existsSync(path.join(exeDir, 'package.json'))) {
        others.push(exeDir);
      }
    } catch {}
    if (others.length === 0) return;
    const flagFile = path.join(app.getPath('userData'), `duplicate-notified-${getRunningVersion() || 'unknown'}`);
    console.warn('[!] Existing BendLens installation(s) detected:', others.join('; '), '| active:', projectDir);
    if (fs.existsSync(flagFile)) return;
    try {
      fs.mkdirSync(path.dirname(flagFile), { recursive: true });
      fs.writeFileSync(flagFile, others.join('\n'), 'utf-8');
    } catch {}
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'BendLens Already Installed',
        message: 'An existing BendLens installation was detected.',
        detail: `Active installation:\n${projectDir}\n\nOther copie(s) found:\n${others.join('\n')}\n\nYou are running the active one above. To avoid conflicts, remove the old copy with its Uninstall option (this also deletes all BendLens app data).`,
        buttons: ['OK']
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Start the embedded Next.js engine. Returns true when a start was attempted.
 * Packaged mode runs Next in-process (Electron's binary is NOT node, so it
 * cannot spawn `next start` as a child script). Dev mode keeps npm/pnpm spawn.
 */
function startBackendServer(projectDir, port, onReady = null) {
  if (serverProcess) return true;

  // Packaged + dev alike: anchor every process.cwd()-based lookup
  // (sample_project, package.json, dist/) to the real engine directory.
  // Without this, the window loads but all API functionalities fail with
  // "Directory not found" on downloaded installs.
  try {
    process.env.BENDLENS_APP_DIR = projectDir;
    if (fs.existsSync(projectDir)) process.chdir(projectDir);
  } catch {}

  if (app.isPackaged) {
    const buildDir = path.join(projectDir, '.next');
    if (!fs.existsSync(buildDir)) {
      console.error('[!] Packaged engine missing production build:', buildDir);
      dialog.showErrorBox(
        'BendLens Engine Missing',
        'The embedded BendLens engine could not be found in this installation.\n\nPlease reinstall BendLens from the official installer.'
      );
      return false;
    }

    const runnerCandidates = [
      path.join(__dirname, 'server-runner.js'),
      path.join(projectDir, 'electron', 'server-runner.js'),
      path.join(process.resourcesPath, 'app', 'electron', 'server-runner.js')
    ];
    const runnerScript = runnerCandidates.find((p) => fs.existsSync(p));

    if (runnerScript) {
      console.log(`[*] Spawning BendLens isolated background engine via ELECTRON_RUN_AS_NODE on port ${port}...`);
      serverProcess = spawn(process.execPath, [runnerScript], {
        cwd: projectDir,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          BENDLENS_APP_DIR: projectDir,
          BENDLENS_APP_VERSION: app.getVersion() || '1.1.43',
          PORT: String(port)
        }
      });

      serverProcess.on('message', (msg) => {
        if (msg && msg.type === 'ready') {
          console.log('[*] Engine IPC ready signal received.');
          if (typeof onReady === 'function') {
            try { onReady(); } catch {}
          }
        }
      });
    } else {
      // In-process fallback if runner script cannot be resolved
      let nextFactory = null;
      try {
        nextFactory = require('next');
      } catch {
        try {
          nextFactory = require(path.join(projectDir, 'node_modules', 'next'));
        } catch (err) {
          console.error('[!] Packaged engine missing bundled Next.js:', err && err.message);
          dialog.showErrorBox(
            'BendLens Engine Missing',
            'The embedded BendLens engine could not be found in this installation.\n\nPlease reinstall BendLens from the official installer.'
          );
          return false;
        }
      }
      try {
        console.log(`[*] Starting embedded BendLens engine (in-process fallback) on port ${port}...`);
        process.env.NODE_ENV = 'production';
        const nextApp = nextFactory({ dev: false, dir: projectDir, hostname: HOST, port });
        const handle = nextApp.getRequestHandler();
        serverProcess = { isEmbedded: true, pid: null };

        const prepareTimeout = setTimeout(() => {
          console.error('[!] Embedded engine prepare() timed out after 60s');
          serverProcess = null;
          dialog.showErrorBox(
            'BendLens Engine Timeout',
            'The embedded engine took too long to start (60s).\n\nThis usually means a corrupted build or resource exhaustion.\nPlease restart the application or reinstall BendLens.'
          );
        }, 60000);

        nextApp
          .prepare()
          .then(() => {
            clearTimeout(prepareTimeout);
            const server = http.createServer((req, res) => handle(req, res));
            server.listen(port, HOST, () => {
              console.log(`[*] Embedded engine listening on ${HOST}:${port}.`);
              if (typeof onReady === 'function') {
                try { onReady(); } catch {}
              }
            });
            server.on('error', (err) => {
              console.error('[!] Embedded engine server error:', err);
              serverProcess = null;
            });
            serverProcess.server = server;
          })
          .catch((err) => {
            clearTimeout(prepareTimeout);
            console.error('[!] Embedded engine failed to start:', err);
            serverProcess = null;
            dialog.showErrorBox(
              'BendLens Engine Failed to Start',
              'The local BendLens engine did not respond in time.\n\nPlease restart the application. If the problem persists, reinstall BendLens.'
            );
          });
      } catch (err) {
        console.error('[!] Embedded engine failed to start:', err);
        serverProcess = null;
        dialog.showErrorBox(
          'BendLens Engine Failed to Start',
          'The local BendLens engine could not be started.\n\n' +
          `Details: ${(err && err.message) || err}\n\n` +
          'Please restart the application. If the problem persists, reinstall BendLens.'
        );
        return false;
      }
    }
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

  if (serverProcess && !serverProcess.isEmbedded) {
    serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Ready in') || text.includes('ready started') || text.includes('compiled client and server')) {
        console.log('[*] Engine ready signal received.');
        if (typeof onReady === 'function') {
          try { onReady(); } catch {}
        }
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
  }
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

    let isEngineReady = false;
    const triggerStudioLoad = () => {
      if (isEngineReady || studioLoaded) return;
      isEngineReady = true;
      loadStudio();
    };

    // 1. In-process engine callback: immediate transition on server.listen
    if (!startBackendServer(projectDir, port, () => {
      console.log('[*] Engine server.listen signal received — transitioning to studio.');
      triggerStudioLoad();
    })) {
      console.error('[!] Backend could not be started — splash will stay visible with the error above.');
      return;
    }

    // 2. Sequential fallback probe (up to 45s, non-overlapping)
    let attempts = 0;
    const maxAttempts = 180; // 180 * 250ms = 45s
    let isProbing = false;

    const probe = () => {
      if (isEngineReady || studioLoaded) return;
      attempts++;
      if (attempts > maxAttempts) {
        console.error('[!] Engine did not become ready in time (45s).');
        dialog.showErrorBox(
          'BendLens Engine Failed to Start',
          'The local BendLens engine did not respond in time (45s).\n\nPlease restart the application. If the problem persists, reinstall BendLens.'
        );
        return;
      }

      if (isProbing) {
        setTimeout(probe, 250);
        return;
      }

      isProbing = true;
      isBendLensServer(activePort, (ready) => {
        isProbing = false;
        if (isEngineReady || studioLoaded) return;
        if (ready) {
          console.log('[*] Engine identity confirmed via HTTP probe.');
          triggerStudioLoad();
        } else {
          setTimeout(probe, 250);
        }
      });
    };

    setTimeout(probe, 200);
  });
}

function loadStudio(attempt = 1) {
  if (!mainWindow || studioLoaded) return;
  studioLoading = true;
  console.log(`[*] Loading studio URL: ${appUrl()} (attempt ${attempt})...`);

  mainWindow
    .loadURL(appUrl())
    .then(() => {
      studioLoaded = true;
      studioLoading = false;
      console.log('[*] Studio URL loaded successfully.');
      checkForDesktopUpdates();

      // Defer duplicate installs detection safely after UI has settled
      try {
        const projectDir = resolveAppDir();
        setTimeout(() => detectDuplicateInstalls(projectDir), 2500);
      } catch {}

      // Recurring desktop check while the window stays open
      if (!loadStudio.updateTimer) {
        loadStudio.updateTimer = setInterval(() => {
          if (mainWindow) checkForDesktopUpdates();
        }, 15 * 60 * 1000);
      }
    })
    .catch((err) => {
      studioLoading = false;
      const msg = (err && err.message) || String(err);
      console.warn(`[!] loadStudio error (attempt ${attempt}):`, msg);

      // Auto-retry on aborted or transient errors (up to 4 attempts with exponential backoff)
      if (attempt < 4 && !studioLoaded) {
        const delay = attempt * 400;
        console.log(`[*] Retrying studio navigation in ${delay}ms...`);
        setTimeout(() => {
          if (!studioLoaded && mainWindow) {
            loadStudio(attempt + 1);
          }
        }, delay);
      }
    });
}

function cleanupServer() {
  if (!serverProcess) return;
  if (serverProcess.isEmbedded) {
    console.log('[*] Closing embedded engine server...');
    try {
      serverProcess.server?.close?.();
    } catch {}
    serverProcess = null;
    return;
  }
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

// ============================================================================
// BendLens Native Desktop Auto-Update Manager
// ============================================================================
// Provides air-gapped, zero-cloud-leakage background update management.
// Automatically discovers new GitHub releases, silently downloads the verified
// setup package in the background, tracks byte-level progress metrics, and executes
// seamless silent in-place installation (/S) with auto-relaunch on user restart.
// ============================================================================

const updateState = {
  status: 'idle', // 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
  version: null,
  artifactName: null,
  downloadUrl: null,
  installerPath: null,
  progress: {
    percent: 0,
    transferredMb: '0',
    totalMb: '0',
    speedMb: '0'
  },
  error: null
};

let activeDownloadReq = null;
const notifiedUpdateVersions = new Set();

function isValidWindowsExe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 20 * 1024 * 1024) return false;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return buf[0] === 0x4d && buf[1] === 0x5a; // 'MZ' magic bytes
  } catch {
    return false;
  }
}

function getUpdateDir() {
  const dir = path.join(app.getPath('userData'), 'pending-update');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
  return dir;
}

function findAnyLocalInstaller(targetVersion) {
  const searchDirs = [
    getUpdateDir(),
    path.join(app.getPath('userData'), 'pending-update'),
    path.join(process.env.APPDATA || '', 'BendLens', 'pending-update'),
    path.join(process.env.APPDATA || '', 'bendlens-platform', 'pending-update'),
    path.join(app.getPath('userData'), 'extracted-app'),
    path.join(os.tmpdir()),
    path.join(os.homedir(), 'Downloads'),
    path.join(process.env.LOCALAPPDATA || '', 'BendLens', 'updates'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'BendLens', 'updates'),
    path.join(__dirname, '..', 'dist')
  ];

  for (const dir of searchDirs) {
    try {
      if (!dir || !fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      const candidates = files
        .filter((f) => /bendlens.*setup/i.test(f) && f.toLowerCase().endsWith('.exe'))
        .map((f) => path.join(dir, f))
        .filter((full) => isValidWindowsExe(full));

      if (targetVersion) {
        const matching = candidates.find((c) => path.basename(c).toLowerCase().includes(targetVersion.toLowerCase()));
        if (matching) return matching;
      }
      if (candidates.length > 0) return candidates[0];
    } catch {}
  }
  return null;
}

function notifyRenderer(channel, payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send(channel, payload);
    }
  } catch {}
}

function streamDownloadToFile(url, partPath, onProgress, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Exceeded maximum redirect limit'));
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return reject(new Error(`Invalid download URL: ${url}`));
    }

    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const req = transport.get(
      url,
      {
        headers: {
          'User-Agent': 'BendLens-Desktop-Updater/1.0',
          Accept: 'application/octet-stream, */*'
        }
      },
      (res) => {
        // Follow standard HTTP 301, 302, 303, 307, 308 redirects (GitHub Releases asset downloads)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = new URL(redirectUrl, url).toString();
          }
          res.resume();
          return resolve(streamDownloadToFile(redirectUrl, partPath, onProgress, maxRedirects - 1));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download server responded with HTTP status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReportTime = Date.now();
        let lastDownloadedBytes = 0;

        const fileStream = fs.createWriteStream(partPath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (now - lastReportTime >= 200 || (totalBytes > 0 && downloadedBytes >= totalBytes)) {
            const timeDiffSec = Math.max(0.001, (now - lastReportTime) / 1000);
            const bytesDiff = downloadedBytes - lastDownloadedBytes;
            const speedBps = bytesDiff / timeDiffSec;
            const speedMb = (speedBps / (1024 * 1024)).toFixed(1);
            const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
            const downloadedMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : 'Unknown';

            if (typeof onProgress === 'function') {
              onProgress({
                percent,
                transferredMb: downloadedMb,
                totalMb,
                speedMb
              });
            }
            lastReportTime = now;
            lastDownloadedBytes = downloadedBytes;
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => resolve({ downloadedBytes, totalBytes }));
        });

        fileStream.on('error', (err) => {
          try { fs.unlinkSync(partPath); } catch {}
          reject(err);
        });
      }
    );

    activeDownloadReq = req;

    req.on('error', (err) => {
      try { fs.unlinkSync(partPath); } catch {}
      reject(err);
    });

    req.setTimeout(600000, () => {
      req.destroy();
      try { fs.unlinkSync(partPath); } catch {}
      reject(new Error('Update download connection timed out'));
    });
  });
}

async function startUpdateDownload(info = {}) {
  const version = info.version || info.latestVersion || updateState.version;
  const artifactName = info.artifactName || info.updateArtifact || `BendLens-Setup-${version}.exe`;
  let downloadUrl = info.downloadUrl || info.url || updateState.downloadUrl;

  if (!downloadUrl && version) {
    downloadUrl = `https://github.com/Keerthivasan004/BendLens/releases/download/v${version}/${artifactName}`;
  }

  if (!downloadUrl) {
    return { success: false, error: 'No valid download URL provided' };
  }

  const updateDir = getUpdateDir();
  const destPath = path.join(updateDir, artifactName);
  const partPath = path.join(updateDir, `${artifactName}.part`);

  // 1. If an installer for this exact version is already cached and valid, mark ready immediately
  if (isValidWindowsExe(destPath)) {
    console.log('[*] Cached update installer found and verified:', destPath);
    updateState.status = 'ready';
    updateState.version = version;
    updateState.artifactName = artifactName;
    updateState.installerPath = destPath;
    updateState.progress = { percent: 100, transferredMb: 'Ready', totalMb: 'Ready', speedMb: '0' };
    updateState.error = null;

    notifyRenderer('update-status-changed', updateState);
    notifyRenderer('update-download-complete', {
      installerPath: destPath,
      version,
      fromCache: true
    });
    return { success: true, status: 'ready', installerPath: destPath, fromCache: true };
  }

  // 2. If already downloading this artifact, return current status
  if (updateState.status === 'downloading' && updateState.version === version) {
    return { success: true, status: 'downloading', progress: updateState.progress };
  }

  console.log(`[*] Initiating background download for BendLens v${version} from:`, downloadUrl);
  updateState.status = 'downloading';
  updateState.version = version;
  updateState.artifactName = artifactName;
  updateState.downloadUrl = downloadUrl;
  updateState.installerPath = null;
  updateState.error = null;
  updateState.progress = { percent: 0, transferredMb: '0', totalMb: '0', speedMb: '0' };

  notifyRenderer('update-status-changed', updateState);

  try {
    if (fs.existsSync(partPath)) {
      try { fs.unlinkSync(partPath); } catch {}
    }

    await streamDownloadToFile(downloadUrl, partPath, (prog) => {
      updateState.progress = prog;
      notifyRenderer('update-download-progress', prog);
    });

    if (isValidWindowsExe(partPath)) {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch {}
      }
      fs.renameSync(partPath, destPath);

      updateState.status = 'ready';
      updateState.installerPath = destPath;
      updateState.progress.percent = 100;
      updateState.error = null;

      console.log(`[*] BendLens v${version} update download verified successfully:`, destPath);
      notifyRenderer('update-status-changed', updateState);
      notifyRenderer('update-download-complete', {
        installerPath: destPath,
        version,
        fromCache: false
      });

      // Show native OS notification announcing ready update
      if (Notification.isSupported()) {
        const notifIcon = resolveWindowIcon();
        const note = new Notification({
          title: 'BendLens Update Downloaded',
          body: `Version v${version} is ready to apply! Restart anytime to finish updating.`,
          ...(notifIcon ? { icon: notifIcon } : {})
        });
        note.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          }
        });
        note.show();
      }

      return { success: true, status: 'ready', installerPath: destPath };
    } else {
      throw new Error('Downloaded installer did not pass Windows PE validation');
    }
  } catch (err) {
    console.warn('[!] Background update download encountered an error:', err.message);
    try { if (fs.existsSync(partPath)) fs.unlinkSync(partPath); } catch {}
    updateState.status = 'error';
    updateState.error = err.message;
    notifyRenderer('update-status-changed', updateState);
    return { success: false, error: err.message };
  } finally {
    activeDownloadReq = null;
  }
}

function applyUpdateAndRestart(args = {}) {
  const targetInstaller =
    args.installerPath ||
    updateState.installerPath ||
    findAnyLocalInstaller(updateState.version);

  console.log('[*] applyUpdateAndRestart triggered. Target installer:', targetInstaller);

  notifyRenderer('update-applying', { version: updateState.version });

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  } catch {}

  cleanupServer();

  if (targetInstaller && fs.existsSync(targetInstaller) && isValidWindowsExe(targetInstaller)) {
    const currentExe = process.execPath;
    console.log('[*] Launching detached silent installer (/S) with automatic relaunch into:', currentExe);

    if (process.platform === 'win32') {
      // Use an isolated detached cmd script to eliminate parent-process termination issues
      const updaterBat = path.join(os.tmpdir(), `bendlens-apply-update-${Date.now()}.cmd`);
      const batContent = [
        '@echo off',
        'chcp 65001 >nul',
        'echo [*] Preparing silent BendLens upgrade...',
        'timeout /t 2 /nobreak >nul',
        'taskkill /F /IM BendLens.exe >nul 2>&1',
        'taskkill /F /IM electron.exe >nul 2>&1',
        `start /wait "" "${targetInstaller}" /S`,
        'timeout /t 1 /nobreak >nul',
        `start "" "${currentExe}"`,
        'timeout /t 2 /nobreak >nul',
        'del "%~f0" >nul 2>&1',
        'exit /b 0'
      ].join('\r\n');

      try {
        fs.writeFileSync(updaterBat, batContent, 'utf-8');
        const child = spawn('cmd.exe', ['/c', updaterBat], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
      } catch (batErr) {
        console.warn('[!] Failed to launch updater script, trying direct spawn fallback:', batErr.message);
        try {
          const child = spawn(targetInstaller, ['/S'], { detached: true, stdio: 'ignore' });
          child.unref();
        } catch {}
      }
    } else {
      try {
        const child = spawn(targetInstaller, [], { detached: true, stdio: 'ignore' });
        child.unref();
      } catch {}
    }
  } else {
    console.warn('[!] No valid installer found to apply on restart.');
  }

  setTimeout(() => {
    try {
      app.quit();
    } catch {
      app.exit(0);
    }
  }, 400);
}

// Background Auto-Update Check:
// Discovers updates from local API, starts background download automatically,
// and notifies once per session.
function checkForDesktopUpdates() {
  http
    .get(`${appUrl()}/api/updates/check?source=desktop`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const info = JSON.parse(data);
          if (info && info.hasUpdate && info.latestVersion) {
            // Automatically start background download for seamless zero-click updates
            if (updateState.status === 'idle' || updateState.status === 'error') {
              startUpdateDownload({
                version: info.latestVersion,
                artifactName: info.updateArtifact,
                downloadUrl: info.downloadUrl
              });
            }

            if (!notifiedUpdateVersions.has(info.latestVersion)) {
              notifiedUpdateVersions.add(info.latestVersion);
              if (Notification.isSupported()) {
                const notifIcon = resolveWindowIcon();
                const note = new Notification({
                  title: 'BendLens Auto-Update Available',
                  body: `Version v${info.latestVersion} is downloading in the background. It will be ready to apply shortly.`,
                  ...(notifIcon ? { icon: notifIcon } : {})
                });
                note.on('click', () => {
                  if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                  }
                });
                note.show();
              }
            }
          }
        } catch {}
      });
    })
    .on('error', () => {});
}

// IPC Handlers for Desktop Auto-Update Lifecycle
ipcMain.handle('get-update-status', () => {
  return updateState;
});

ipcMain.handle('start-update-download', async (_event, info) => {
  return startUpdateDownload(info);
});

ipcMain.on('apply-update-and-restart', (_event, args) => {
  applyUpdateAndRestart(args || {});
});

ipcMain.on('app-quit-and-update', () => {
  applyUpdateAndRestart({});
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion() || '1.1.43';
});

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
