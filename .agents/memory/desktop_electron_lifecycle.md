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
  - Packaged mode runs the production engine via a **dedicated isolated background Node.js child process** (`electron/server-runner.js` spawned using `process.execPath` with `ELECTRON_RUN_AS_NODE: '1'`).
    - **Zero "(Not Responding)" hangs**: Decoupling Next.js from the Electron Main Process ensures that long-running AST parsing, directory scanning, and diagram generation compute in a separate OS thread and never starve Electron's Windows message pump.
    - **Fallback**: Gracefully falls back to in-process prepare if process spawning is ever inhibited.
    - Readiness = IPC `ready` message from `server-runner.js` + stdout signal + sequential HTTP identity probe fallback (250ms interval, 45s timeout).
    - `loadStudio()` incorporates a single-flight execution lock (`studioLoaded`/`studioLoading`) and automatic exponential retry on Chromium navigation aborts (`ERR_ABORTED -3`) so the window never gets stranded on `splash.html`.
    - `detectDuplicateInstalls()` is deferred until 2.5s after studio load to ensure modal dialogs never freeze the startup message pump or trigger Windows Application Hang (Event 1002).
    - Ingestion-to-Studio handoff: scans completed on the landing page persist to `sessionStorage` and `localStorage`, and `/lens` automatically checks session cache, then local path, with immediate fallback to `loadSampleProject()` to prevent infinite loading spinners.
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - **GPU Hardware Acceleration & Render Pipeline**:
    - `enable-gpu-rasterization`, `enable-zero-copy`, `ignore-gpu-blocklist`, and `CanvasOopRasterization` ensure vector diagrams and animations render directly on the GPU at 60+ FPS.
    - `backgroundThrottling: false` and `disable-background-timer-throttling` prevent frame drops or timer freezing when focus shifts away.
    - `spellcheck: false` eliminates background dictionary parsing on large schemas.
    - `server-runner.js` maintains persistent HTTP socket keep-alive (`keepAliveTimeout: 65000ms`) to eliminate per-request connection overhead.
  - Intercepts external link navigation (`setWindowOpenHandler`) to open links in the system's default browser via `shell.openExternal`.
  - Configures `session.defaultSession.on('will-download')` to prevent native download prompts from stealing cursor focus or freezing the window.
- **Native Desktop Streaming Auto-Update & Silent In-Place Upgrade Engine**:
  - `electron/main.js` implements a dedicated `AutoUpdateManager`:
    - **Zero-Friction Automatic Background Downloads**: `checkForDesktopUpdates()` automatically discovers newer GitHub releases from `/api/updates/check?source=desktop` and initiates an asynchronous background stream download to `<userData>/pending-update/` using Node `https`/`http` with multi-hop redirect following (301/302/307/308 asset blobs from `objects.githubusercontent.com`). No manual "Update Now" click is required.
    - **Live Progress Telemetry**: Sends real-time byte metrics (`percent`, `transferredMb`, `totalMb`, `speedMb`) via IPC (`update-download-progress`, `update-status-changed`).
    - **Validation**: Verifies PE binary integrity via `isValidWindowsExe` (checking MZ header and minimum 20MB file size).
    - **Silent In-Place Installation (`/S`) & Instant Relaunch**: `applyUpdateAndRestart` gracefully terminates the local engine server (`cleanupServer()`), hides the window, and invokes a detached runner batch script (`bendlens-apply-update-*.cmd`). The runner script waits 2 seconds for Electron and engine processes to exit and release file locks, ensures processes are terminated via `taskkill /F /IM BendLens.exe`, runs `start /wait "" "${installer}" /S`, and relaunches `BendLens.exe` cleanly.
      The NSIS installer applies the update completely silently in the background, wipes stale version caches, and automatically relaunches `BendLens.exe` within 2 seconds. The user never sees a manual installation wizard.
    - **Automatic Update on Quit**: When an update package has downloaded and verified, if the user quits the app (`app.on('before-quit')`), the silent installer is automatically invoked so the app opens into the updated version on next launch.
    - **Preload Bridge**: `electron/preload.js` exposes `window.bendlensDesktop.startUpdateDownload`, `getUpdateStatus`, `applyUpdateAndRestart`, `onUpdateProgress`, `onUpdateStatusChanged`, and `onUpdateComplete`.
    - **In-App UI Integration**: `UpdateIndicator` and `UpdateShowcaseModal` render live download progress indicators when downloading, and transform into a 1-click **Restart & Update** action button once the verified installer is ready.
- **Desktop update discovery, acceleration & telemetry**:
  - A packaged install has no `dist/` folder. `GET /api/updates/check?source=desktop` discovers releases from GitHub (`Keerthivasan004/BendLens`) and installer assets (`BendLens-Setup-*.exe`) using `maxVersion(tagVersion, assetVersion)` to ensure published release tags are never suppressed. Returns direct `downloadUrl`.
  - Baseline version is synchronized at `1.1.48` across `package.json`, `releaseInfo.js`, `MainWindow.cs`, `electron/main.js`, and `preload.js`.
  - In `electron/preload.js`, the desktop version is queried directly via `ipcRenderer.sendSync('get-app-version')` (without sandboxed-breaking `fs` imports), and exposes `window.bendlensDesktop.quitApp()` triggering IPC `app-quit-and-update`.
  - `electron/main.js` injects `BENDLENS_APP_VERSION: app.getVersion()` into the background engine process environment, and `src/lib/releaseInfo.js` checks `process.env.BENDLENS_APP_VERSION` first. This eliminates any internal version desynchronization between the Electron shell and the embedded Next.js engine.
  - In `.github/workflows/release.yml`, `Synchronize package version with Git tag` runs strictly **before** `pnpm run build` so that the compiled Next.js standalone bundle is stamped with the exact release tag version (preventing false "Update Ready" prompts on freshly installed builds).
  - `/api/updates/apply` implements multi-location local installer probing (`findLocalInstaller` across `dist/`, `%USERPROFILE%\Downloads`, `%TEMP%`, and AppData update dirs) with binary validation (`isValidWindowsExe` checking MZ header, valid size >= 20MB, and strict `targetVersion` matching to prevent stale installer execution) and silent `/S` detached execution.
  - **Git Workspace Safety**: In development/git workspaces, `/api/updates/apply` cleanly synchronizes `package.json` to the target version without executing interactive or destructive shell commands (`git pull`) that could prompt `Terminate batch job (Y/N)?` or cause merge conflicts.
  - When no local installer is found, it performs high-performance native Windows `curl.exe` download (`curl.exe -L -f -s -S --retry 3 --retry-delay 2 -o ...`) directly to `%TEMP%\BendLens-Setup-${ver}.exe.part`. `curl.exe` uses native Windows Schannel SSL and effortlessly handles 130MB+ multi-redirect AWS/Azure blob downloads without Node.js `undici` socket dropouts (`UND_ERR_SOCKET`). Gracefully falls back to PowerShell `Invoke-WebRequest` and Node `fetch` if needed.
  - **Graceful File-Lock Release & Exit**: When an installer is launched, `launchInstallerExe` delegates execution to an isolated detached cmd script that waits 2 seconds, terminates leftover `BendLens.exe` instances, runs the installer silently with `/S`, and automatically relaunches the updated `BendLens.exe`.
  - **Router Action Dispatch Crash Elimination**: `UpdateIndicator` uses isolated DOM anchor clicks (`a.target = '_blank'`) and window popups for external download links, completely avoiding `window.location.href` assignments that crash Next.js App Router SPA navigation.
  - Both `/api/updates/apply` and `/api/updates/check` strictly return HTTP 200 JSON in all error cases, preventing Next.js empty/HTML 500 error responses (`Engine returned non-JSON response (HTTP 500)`).
  - `UpdateIndicator` and `UpdateShowcaseModal` incorporate seamless fallback to direct release download URLs if an older installed engine returns a non-JSON or HTTP error, guaranteeing that installed users can always update without interruption.
  - **Accelerated Update Pipeline**:
    - `scripts/build_brand_assets.js` skips spawning PowerShell and `System.Drawing` conversion if `public/icon.ico` is already generated, saving 3-5 seconds of cold-start delay per update.
    - `/api/updates/apply` checks for existing Desktop shortcuts before launching PowerShell.
    - Returns `durationMs` telemetry in the API response.
  - **Real-Time Update Telemetry & Timers**:
    - `UpdateIndicator` and `UpdateShowcaseModal` start a high-resolution stopwatch timer (`updateElapsedTime`, formatted as `00:0X.X`) ticking at 50ms precision the moment an update is triggered.
    - Displays active elapsed time in the floating notification, update action button, and modal update pipeline.
  - **User-Controlled Completion Notification**:
    - Eliminated artificial 1.4-second auto-closing timeouts so users always have full visibility into update status.
    - Renders a prominent **Installer Launched** or **Software Update Ready** notification banner displaying target version (`vX.X.X`), total elapsed duration (e.g. `Completed in 1.8s`), and an explicit **Close** or **Releases** button.
  - **Turbopack External Module & ZIP Handling**:
    - Next.js with Turbopack and pnpm hashes server external packages into aliases (`adm-zip-<hash>`), creating NTFS junctions in `.next/node_modules/` that do not exist or break in packaged desktop installations.
    - Centralized in `src/lib/safeAdmZip.js` using dynamic `eval('require')('adm-zip')` to bypass Turbopack static AST hashing across `/api/updates/apply`, `/api/upload`, and `/api/git-clone`.
    - `electron/server-runner.js` automatically detects and establishes local junctions in `node_modules/` for any legacy hashed aliases (`adm-zip-[0-9a-fA-F]+`) during boot.
  - Fully offline environments fall back smoothly to the bundled baseline version (`1.1.48`).
- **Desktop & Downloaded UI Gating (`src/lib/useIsDesktop.js`)**:
  - `checkIsDesktop()` performs multi-vector detection: `window.bendlensDesktop?.isDesktop === true`, user-agent regex (`/Electron|BendLens/i`), renderer process flags (`window.process.versions.electron`), WebView2 bridge (`window.chrome.webview`), file protocol (`file:`), and local machine runtime hostnames (`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, `*.local`, `192.168.*`, `10.*`).
  - Uses immediate lazy initial state in `useIsDesktop()` (`useState(() => checkIsDesktop())`) to eliminate client-side hydration delay.
  - Downloaded users and desktop runtime users never see redundant "Download Desktop App" buttons (`!isDesktop && !isLocal` guard across navbar, hero ingestion, CTA, and studio header).
  - Version number indicator is universally visible in all states: installed version `v1.1.48` is ALWAYS displayed (e.g. `v1.1.48 • Up to Date` or `v1.1.48 (v1.1.49 Ready)`), ensuring the installed version is never missing or obscured. Remote web visitors see a clean version badge (`v1.1.48`) with interactive feature showcase access.
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

---

## 4. Ultra-Lightweight .NET 8 WebView2 Architecture (`desktop/`)
- **Native Microsoft Edge WebView2 Shell**:
  - Leverages the Windows OS-provided Edge Chromium runtime (`Microsoft.Web.WebView2`), completely removing the ~180MB bundled Chromium binary.
  - RAM footprint: **~40–60 MB** (vs 250 MB+ on Electron).
  - Single-instance mutex (`Global\BendLens-Studio-SingleInstance`).
  - Dark mode chrome (`#020617`), native SVG/ICO logo, and external URL interception via `NewWindowRequested`.
- **Standalone Engine Pairing**:
  - `next.config.js` sets `output: 'standalone'`, pruning unused dependency trees.
  - `scripts/build-desktop.ps1` produces a self-contained single-file `BendLens.exe` in `dist/BendLens-WebView2/`.
- **Commands**:
  - Run dev desktop: `npm run desktop:run`
  - 1-click lightweight build: `npm run desktop:build`
