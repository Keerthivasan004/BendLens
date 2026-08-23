const { app, BrowserWindow, dialog, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
const PORT = 3000;
const APP_URL = `http://localhost:${PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'BendLens - Universal Backend Architecture & Blast Platform',
    icon: path.join(__dirname, '../public/icon.svg'),
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });

  // Check if server is running, then load
  checkServerAndLoad();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates on startup
    checkForDesktopUpdates();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkServerAndLoad() {
  const check = () => {
    http
      .get(APP_URL, (res) => {
        if (res.statusCode === 200) {
          mainWindow.loadURL(APP_URL);
        } else {
          setTimeout(check, 400);
        }
      })
      .on('error', () => {
        setTimeout(check, 400);
      });
  };
  check();
}

// Background Auto-Update Check for Desktop App
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
                icon: path.join(__dirname, '../public/icon.svg')
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
