# Desktop & Electron Lifecycle

BendLens can be packaged and distributed as a native desktop application for Windows.

---

## 1. Electron Architecture (`electron/main.js`)
- **Single Instance Lock**:
  - Uses `app.requestSingleInstanceLock()` to prevent duplicate background instances.
  - If a second instance is launched, the existing window is focused and restored.
- **Instant Splash Screen (`splash.html`)**:
  - Launches in `< 50ms`.
  - Displays native animated CSS pulsating logo and status text while the backend server initializes.
- **Backend Server Coordination**:
  - Checks if port 3000 is already active (`http.get('http://127.0.0.1:3000')`).
  - If not active, it spawns `npm run dev` or the bundled Next.js server as a child process.
  - Polls until the server returns `200 OK` before redirecting `mainWindow.loadURL('http://127.0.0.1:3000')`.
- **Security**:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - Intercepts external link navigation (`setWindowOpenHandler`) to open links in the system's default browser via `shell.openExternal`.

---

## 2. Launching and Packaging

### Development Launch
```bash
npm run desktop
# or
node scripts/launch-desktop.js
```

### 1-Click Windows Batch Files
- `run.bat`: Runs development server and opens default browser.
- `BendLens.bat`: Runs the native desktop window.

### Production Packaging
```bash
npm run dist
```
Uses `electron-builder` to package:
1. Portable Windows executable (`BendLens.exe`).
2. One-click NSIS installer with desktop shortcut creation.
Output is placed in `dist/`.
