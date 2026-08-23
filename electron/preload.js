const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bendlensDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
});
