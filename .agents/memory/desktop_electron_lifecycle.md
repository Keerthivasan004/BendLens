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
  - `resolveWindowIcon()`: probes `resources/public`, `resources/app/public`, `app.asar.unpacked/public`, then dev `public/` — first existing `icon.ico` (win) / `icon.png` wins; `undefined` fallback is safe. Window + update-notification icons both use it (never a bare `__dirname` path that breaks inside asar).
  - `resolvePort()`: reuses a live BendLens server (verified by identity probe) or picks the first free port from `[3000, 3001, 3030, 8000, 5000]`.
  - `isBendLensServer()`: probes `/api/updates/check` for `{ success: true, currentVersion: string }` — never attaches to a foreign service on port 3000.
  - Packaged mode runs the production engine **in-process** (`require('next')` + `prepare()` + `http.createServer(handle).listen(port, 127.0.0.1)`, `NODE_ENV=production`) — **no npm required** on the user machine. Rationale: `process.execPath` in a packaged app is the Electron binary, not Node, so `spawn(process.execPath, [nextBin, 'start', ...])` cannot boot Next and leaves the app stuck on splash.
  - Dev mode keeps the `npm/pnpm run dev|start` spawn; child-process stdio/exit handlers are skipped for the embedded server.
  - Readiness = identity probe success (150ms poll, ~20s timeout); on timeout a native error dialog is shown instead of loading a dead URL.
- **Security**:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - Intercepts external link navigation (`setWindowOpenHandler`) to open links in the system's default browser via `shell.openExternal`.
- **Desktop update notification**:
  - `checkForDesktopUpdates()` polls local `/api/updates/check` once after load + every 15 min; native `Notification` fires once per `latestVersion` (tracked in `notifiedUpdateVersions`), click focuses/restores the studio window.
  - In-app `UpdateIndicator` polls the same endpoint every 5 min + on window focus/tab-visible, persists dismissal per version (`bendlens-update-dismissed-<version>` in localStorage so new releases re-notify), surfaces check failures instead of faking success, and shows the ready installer filename (`updateArtifact`). It renders **only** for downloaded-desktop users (`useIsDesktop()` → `window.bendlensDesktop.isDesktop`); web users get null since the deployed web app is always current.
- **Desktop update discovery**: a packaged install has no `dist/` folder, so local-only detection could never fire there. `GET /api/updates/check?source=desktop` (called by `UpdateIndicator` and Electron's `checkForDesktopUpdates`) additionally compares the public GitHub release tag (`Keerthivasan004/BendLens`, version metadata only, 10-min cache, 6s timeout, silent local fallback when offline). Plain callers (including the engine identity probe) stay purely local.
- **Desktop-only UI gating** (`src/lib/useIsDesktop.js`): `UpdateIndicator` returns null on web; both "Download Desktop App" buttons (landing nav in `page.jsx`, "Download App" in `Header.jsx`) render only when NOT desktop.
- **Theme**: `darkMode: 'class'` + CSS vars under `:root`/`.dark`; `layout.jsx` applies the saved `bendlens-theme` in a pre-hydration head script and both pages mirror it in state, so the toggle can never desync or flash-wrong on load.

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
- `electron-builder` (`asar: false`, `asarUnpack` for `public/icon.*`, `extraResources` mirroring `public/icon.{ico,png,svg}`, whitelisted `files`: `package.json`, `next.config.js`, `.next`, `public`, `electron`, `sample_project`; prod `node_modules` bundled automatically) produces:
  1. Portable executable (`BendLens-Portable-<version>.exe`).
  2. One-click NSIS installer (`BendLens-Setup-<version>.exe`) with desktop shortcut creation.
- Windows executable icon MUST be `public/icon.ico` (`win.icon`, `nsis.installerIcon`, `nsis.uninstallerIcon`). `.svg` is invalid for exe embedding and yields the default Electron icon in the packaged app.
- Output is placed in `dist/`.
- `/api/download-app` validates MZ magic bytes before serving any `.exe` (dist installer → legacy `BendLens.exe` → CSC compile), then falls back to a source ZIP (requires Node on the user machine). `scripts/build-installer.js` writes only `BendLens-Setup.cmd` — never batch text to a `.exe` path.
- Brand source of truth: `src/components/Logo.jsx` (unique gradient IDs per mount via `useId`) == `public/icon.svg` == `scripts/generate-icons.js` template. Regenerate rasterized `icon.png`/`icon.ico` via `scripts/build_brand_assets.js` after SVG changes.
