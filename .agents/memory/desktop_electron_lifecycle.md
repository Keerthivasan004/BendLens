# Desktop & Electron Lifecycle

BendLens ships as a true native Windows application: double-click → splash → studio window with an embedded production server. No browser, no localhost tab, no Node/npm required on the user machine.

---

## 1. Electron Architecture (`electron/main.js`)
- **Single Instance Lock**:
  - Uses `app.requestSingleInstanceLock()` to prevent duplicate background instances.
  - If a second instance is launched (e.g. user re-downloaded and started the app again while it is running), no second engine boots — the existing window is restored, shown, raised (`restore()` + `show()` + `focus()` + `moveTop()`) and the duplicate exits.
- **Reinstall / duplicate-install safety**:
  - `getRunningVersion()` (`app.getVersion()`), `clearStaleExtractedApp()` / `stampExtractedApp()`: the `app.asar` extraction cache (`<userData>/extracted-app`) carries a version marker (`extracted-app.version`). A version mismatch wipes the stale extraction so a re-downloaded build can never boot the previous version's files.
  - `isBendLensServer()` returns `(isOurs, serverVersion)`; `resolvePort()` reuses a live engine ONLY when its version matches this install — a new build never attaches to an older running engine, it starts its own on the next free port.
  - `detectDuplicateInstalls()`: on packaged Windows boot, probes NSIS (`%LOCALAPPDATA%\Programs\BendLens`), legacy (`%LOCALAPPDATA%\BendLens`), machine (`%ProgramFiles%\BendLens`) and portable copies; if copies other than the active one exist, logs them and shows a once-per-version "BendLens Already Installed" dialog naming the active install and pointing at Uninstall for full cleanup.
- **Full cleanup on uninstall**:
  - NSIS config sets `deleteAppDataOnUninstall: true` (+ `uninstallDisplayName`, `createStartMenuShortcut`, `runAfterFinish`, `include: scripts/installer.nsh`).
  - `scripts/installer.nsh` `customInstall` removes the legacy `%LOCALAPPDATA%\BendLens` payload and the stale `extracted-app` cache so reinstalls boot clean; `customUnInstall` wipes `%APPDATA%\BendLens`, `%APPDATA%\com.bendlens.studio`, legacy payload dir, `%TEMP%\.bendlens_history.json`, and all shortcuts — deleting the app deletes all related app data.
- **App identity**: `app.setAppUserModelId('com.bendlens.studio')` (matches `package.json` `appId`) for taskbar grouping and notifications.
- **Instant Splash Screen (`splash.html`)**:
  - Launches in `< 50ms`.
  - Displays native animated CSS pulsating logo and status text while the backend server initializes.
- **Backend Server Coordination**:
  - `resolveAppDir()`: packaged app → `<resources>/app` (asar disabled); dev workspace → repo root.
  - `process.env.BENDLENS_APP_DIR` + `process.chdir(projectDir)` are set in `startBackendServer()` before boot, so every `process.cwd()`-based lookup in API routes resolves to the real engine dir on downloaded installs. Without this the window opens but all functionalities fail with "Directory not found".
  - `src/lib/appPaths.js` (`getAppRoot()` / `getSampleProjectPath()`): centralized packaged-aware resolution — `BENDLENS_APP_DIR` → `<resources>/app` (when it holds `package.json`) → `process.cwd()`; sample path probes app-root, resource mirrors, then cwd. All of `analyze`/`sample`/`current`/`impact` fallbacks, `releaseInfo`, `download-app`, and `updates/apply` use it instead of bare `process.cwd()`.
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
- Named system mutex (`Global\BendLens-Studio-SingleInstance`): launching a re-downloaded copy while BendLens runs shows a "BendLens Already Installed & Running" notice and exits instead of booting a conflicting second engine.
- Resolves the installed runtime: exe directory → `%LOCALAPPDATA%\Programs\BendLens` (NSIS per-user) → `%LOCALAPPDATA%\BendLens` (legacy Setup.cmd payload) → `%ProgramFiles%\BendLens`. Never references a developer machine path. (The Programs-first order matters: previously the NSIS location was missed, so after a fresh NSIS install the launcher kept booting the stale legacy copy.)
- If the Electron runtime is present → instant native launch (splash + embedded engine).
- Otherwise requires `package.json` + `node_modules` + `.next` build + Node.js on PATH; starts `npm run start` hidden and opens the browser **only after the engine responds**.
- If requirements are missing or startup fails → a `MessageBox` guides the user to install `BendLens-Setup.exe`. Never opens a dead `localhost:3000` tab.

## 4. Reinstall & Uninstall Flows
- **Re-download over an existing install**: `BendLens-Setup.cmd` now behaves like a professional installer:
  - Detects existing installations (NSIS at `%LOCALAPPDATA%\Programs\BendLens`, legacy at `%LOCALAPPDATA%\BendLens`, machine at `%ProgramFiles%\BendLens`)
  - Prompts: **Upgrade** (keeps user data, backs up/restores `userData` folder) or **Clean Install** (removes old data)
  - Lets user choose **install directory** (default `%LOCALAPPDATA%\Programs\BendLens`)
  - Lets user choose **shortcuts**: Desktop (Y/N), Start Menu (Y/N) — just like top-tier software
  - Stops running BendLens processes before extracting (avoids locked/half-written files)
  - Writes a full-cleanup `Uninstall-BendLens.cmd` into the install dir
  - First-run and re-run now work identically: the same prompts appear, upgrade path preserves data
- **NSIS Installer (`npm run dist`)**: Full wizard (Welcome → License → Components [Desktop/Start Menu shortcuts] → Directory → Install → Finish). `deleteAppDataOnUninstall: true` + `customUnInstall` wipes app + `%APPDATA%\BendLens`/`com.bendlens.studio`, legacy dirs, temp history, shortcuts.
- **Full removal**: NSIS Uninstall or legacy `Uninstall-BendLens.cmd` both wipe app + all data + shortcuts.

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
