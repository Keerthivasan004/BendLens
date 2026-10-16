const { contextBridge, ipcRenderer } = require('electron');

let appVersion = '1.1.43';
try {
  if (ipcRenderer && typeof ipcRenderer.sendSync === 'function') {
    const v = ipcRenderer.sendSync('get-app-version');
    if (v) appVersion = v;
  }
} catch {}

if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
  contextBridge.exposeInMainWorld('bendlensDesktop', {
    isDesktop: true,
    platform: process.platform,
    version: appVersion,
    getUpdateStatus: () => {
      try {
        return ipcRenderer.invoke('get-update-status');
      } catch {
        return Promise.resolve(null);
      }
    },
    startUpdateDownload: (info) => {
      try {
        return ipcRenderer.invoke('start-update-download', info || {});
      } catch {
        return Promise.resolve({ success: false });
      }
    },
    applyUpdateAndRestart: (installerPath) => {
      try {
        ipcRenderer.send('apply-update-and-restart', { installerPath });
      } catch (err) {
        console.warn('Failed to send apply-update-and-restart:', err);
      }
    },
    onUpdateProgress: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update-download-progress', handler);
      return () => ipcRenderer.removeListener('update-download-progress', handler);
    },
    onUpdateStatusChanged: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update-status-changed', handler);
      return () => ipcRenderer.removeListener('update-status-changed', handler);
    },
    onUpdateComplete: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update-download-complete', handler);
      return () => ipcRenderer.removeListener('update-download-complete', handler);
    },
    quitApp: () => {
      try {
        if (ipcRenderer && typeof ipcRenderer.send === 'function') {
          ipcRenderer.send('app-quit-and-update');
        }
      } catch (err) {
        console.warn('Failed to send app-quit-and-update:', err);
      }
    }
  });
}
