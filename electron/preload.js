const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let appVersion = '1.1.32';
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.version) appVersion = pkg.version;
  }
} catch {}

if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
  contextBridge.exposeInMainWorld('bendlensDesktop', {
    isDesktop: true,
    platform: process.platform,
    version: appVersion
  });
}
