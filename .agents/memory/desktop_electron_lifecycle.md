# Desktop & Electron Lifecycle

BendLens ships as a true native Windows application: double-click → splash → studio window with an embedded production server. No browser, no localhost tab, no Node/npm required on the user machine.

---

## 1. Electron Architecture (`electron/main.js`)
- **Single Instance Lock**:
  - Uses `app.requestSingleInstanceLock()` to prevent duplicate background instances.
  - If a second instance is launched, the existing window is focused and restored.
- **App identity**: `app.setAppUserModelId('com.bendlens.studio')` (matches `package.json` `appId`) for taskbar grouping and notifications.
- **Instant Splash Screen (`splash.html`)**:
  - Launches in `< 50ms`.
  - Displays native animated CSS pulsating logo and status text while the backend server initializes.
- **Backend Server Coordination**:
  - `resolveAppDir()`: packaged app → `<resources>/app` (asar disabled); dev workspace → repo root.
  - `resolvePort()`: reuses a live BendLens server (verified by identity probe) or picks the first free port from `[3000, 3001, 3030, 8000, 5000]`.
  - `isBendLensServer()`: probes `/api/updates/check` for `{ success: true, currentVersion: string }` — never attaches to a foreign service on port 3000.
  - Packaged mode spawns the production engine with Electron's own Node (`process.execPath` + bundled `next start -p <port> -H 127.0.0.1`, `NODE_ENV=production`, `windowsHide: true`) — **no npm required** on the user machine.
  - Dev mode keeps the `npm/pnpm run dev|start` spawn.
  - Readiness = identity probe success (150ms poll, ~20s timeout); on timeout a native error dialog is shown instead of loading a dead URL.
- **Security**:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - Intercepts external link navigation (`setWindowOpenHandler`) to open links in the system's default browser via `shell.openExternal`.

---

## 2. Native Launcher (`scripts/BendLensLauncher.cs` → `BendLens.exe`)
- Resolves the installed runtime: exe directory → `%LOCALAPPDATA%\BendLens` → `%ProgramFiles%\BendLens`. Never references a developer machine path.
- If the Electron runtime is present → instant native launch (splash + embedded engine).
- Otherwise requires `package.json` + `node_modules` + `.next` build + Node.js on PATH; starts `npm run start` hidden and opens the browser **only after the engine responds**.
- If requirements are missing or startup fails → a `MessageBox` guides the user to install `BendLens-Setup.exe`. Never opens a dead `localhost:3000` tab.

---

## 3. Launching and Packaging

### Development Launch
```bash
npm run desktop
# or
node scripts/launch-desktop.js
```

### 1-Click Windows Batch Files
- `run.bat`: Native desktop window if Electron is present, else dev server + browser (developer flow).
- `BendLens.bat`: Same with Desktop shortcut creation.

### Production Packaging
```bash
npm run dist
```
- `predist` runs `next build` automatically so `.next` is always fresh.
- `electron-builder` (`asar: false`, whitelisted `files`: `package.json`, `next.config.js`, `.next`, `public`, `electron`, `sample_project`; prod `node_modules` bundled automatically) produces:
  1. Portable executable (`BendLens-Portable-<version>.exe`).
  2. One-click NSIS installer (`BendLens-Setup-<version>.exe`) with desktop shortcut creation.
- Output is placed in `dist/`.
- `/api/download-app` serves `dist/` installer artifacts first (Setup → Portable), then the legacy exe/ZIP fallbacks — so the website Download button delivers the true native app once built.
