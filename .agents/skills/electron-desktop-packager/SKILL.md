---
name: electron-desktop-packager
description: Guide for launching, debugging, packaging, and configuring the Electron desktop application and Windows standalone executables in BendLens.
---

# Electron Desktop Packager Skill

Use this skill when you need to:
- Launch or debug the native Electron desktop window.
- Customize the desktop splash screen (`electron/splash.html`) or window frame behavior.
- Build production Windows executables (`BendLens.exe`) or NSIS installers.
- Troubleshoot port conflicts, child process lifecycle, or single-instance locking.

---

## Desktop Architecture

1. **Main Process (`electron/main.js`)**:
   - Manages application lifecycle and native window creation (`app.setAppUserModelId('com.bendlens.studio')`).
   - Enforces single-instance lock (`app.requestSingleInstanceLock()`); a second launch restores/shows/raises the existing window and exits — never a second engine.
   - **Reinstall safety**: version-guarded `extracted-app` cache (`extracted-app.version` marker — mismatch wipes the stale extraction); version-aware `resolvePort()` (reuses a live engine only when its `/api/updates/check` version matches `app.getVersion()`); `detectDuplicateInstalls()` warns once per version when NSIS/legacy/portable copies coexist.
   - **Uninstall cleanup**: `build.nsis` sets `deleteAppDataOnUninstall: true` (+ `uninstallDisplayName`, `runAfterFinish`, start-menu shortcut); `scripts/installer.nsh` (`customInstall`/`customUnInstall`, wired via `nsis.include`) clears legacy payload + stale caches on reinstall and wipes `%APPDATA%\BendLens`, legacy dirs, `%TEMP%\.bendlens_history.json`, and shortcuts on uninstall.
   - Immediately loads the local lightweight splash screen (`splash.html`).
   - Resolves the engine directory (`resolveAppDir()`: packaged `<resources>/app`, dev repo root). The C# launcher probes `%LOCALAPPDATA%\Programs\BendLens` (NSIS) BEFORE `%LOCALAPPDATA%\BendLens` (legacy) — keep that order or reinstalls boot the stale copy.
   - Picks a port (`resolvePort()` over `[3000, 3001, 3030, 8000, 5000]`) reusing only identity-verified, version-matched BendLens servers (`isBendLensServer()` probes `/api/updates/check`).
   - Packaged mode spawns the production engine in an isolated background process via `electron/server-runner.js` (`process.execPath` + `ELECTRON_RUN_AS_NODE: '1'`) with in-process fallback — eliminating Windows "(Not Responding)" window hangs during heavy analysis; dev mode spawns `npm/pnpm run dev|start`.
   - Shows a native error dialog if the engine fails instead of loading a dead URL.
2. **Native Launcher (`scripts/BendLensLauncher.cs` → `BendLens.exe`)**:
   - Named mutex (`Global\BendLens-Studio-SingleInstance`): re-launch while running shows "Already Installed & Running" and exits.
   - Resolves installed runtime (exe dir → `%LOCALAPPDATA%\Programs\BendLens` → `%LOCALAPPDATA%\BendLens` → `%ProgramFiles%\BendLens`); no developer-path fallback.
   - Electron fast path when present; otherwise verified `npm run start` (requires runtime + Node + `.next`) with browser opened only on success, `MessageBox` guidance on failure.
2. **Legacy CMD installer (`scripts/build-installer.js` → `public/downloads/`)**:
   - `BendLens-Setup.cmd` is a **professional interactive installer**:
     - Detects existing installs (NSIS at `%LOCALAPPDATA%\Programs\BendLens`, legacy at `%LOCALAPPDATA%\BendLens`, machine at `%ProgramFiles%\BendLens`)
     - Prompts: **Upgrade** (backs up/restores `userData`) or **Clean Install**
     - **Install directory** choice (default `%LOCALAPPDATA%\Programs\BendLens`)
     - **Shortcut choices**: Desktop (Y/N), Start Menu (Y/N)
     - Stops running processes before extract, writes `Uninstall-BendLens.cmd` to install dir
     - First-run and re-run identical: same prompts, upgrade preserves data
   - `Uninstall-BendLens.cmd` performs full wipe (install dirs, `%APPDATA%\BendLens` + `com.bendlens.studio`, temp history, shortcuts). Regenerate both via `node scripts/build-installer.js` (both files are committed).
3. **NSIS Installer (`npm run dist` → `dist/BendLens-Setup-<version>.exe`)**:
   - Full wizard: Welcome → License → **Components** (Desktop shortcut, Start Menu shortcut) → **Directory** (user chooses path) → Install → Finish.
   - `oneClick: false`, `allowToChangeInstallationDirectory: true`, `createDesktopShortcut: "always"`.
   - `customInstall` kills running BendLens, clears legacy `%LOCALAPPDATA%\BendLens` and stale `extracted-app` cache.
   - `customUnInstall` + `deleteAppDataOnUninstall: true` wipes everything.
2. **Preload Script (`electron/preload.js`)**:
   - Secure IPC bridge between renderer and Electron APIs.
3. **Packaging Tooling (`electron-builder`)**:
   - Configuration located in `package.json` under `"build"`.
   - Targets: `portable` and `nsis`.
   - Output directory: `dist/`.

---

## Commands Reference

| Task | Command |
|---|---|
| Launch Desktop App (Dev) | `npm run desktop` or `node scripts/launch-desktop.js` |
| 1-Click Desktop Launcher | Run `BendLens.bat` |
| Build Windows Installer | `npm run dist` (`predist` runs `next build` first; outputs `BendLens-Setup-<version>.exe` + `BendLens-Portable-<version>.exe` in `dist/`, served first by `/api/download-app`) |
| Generate Desktop Icons | `node scripts/generate-icons.js` |

---

## Troubleshooting Checklist
- **Port 3000 Conflict**: handled automatically — `resolvePort()` verifies server identity AND version (a mismatched-version live engine is skipped, never reused) and falls back to 3001/3030/8000/5000. Never attaches to a foreign service.
- **Re-downloaded app misbehaving**: caused by stale state — check for duplicate installs (`%LOCALAPPDATA%\Programs\BendLens` vs `%LOCALAPPDATA%\BendLens`), a version-mismatched `extracted-app` cache (`%APPDATA%\BendLens\extracted-app.version`), or an install-over-running-app overwrite. All three are now handled (duplicate dialog, version-guarded extraction/port reuse, pre-install `taskkill` + `customInstall` cleanup).
- **First run works, second run fails**: fixed — `BendLens-Setup.cmd` now detects existing installs, offers Upgrade (preserves `userData`) or Clean Install, stops running processes before extracting, and writes an uninstaller. NSIS installer has full wizard with Components (shortcut choices) and Directory pages.
- **Uninstall leftovers**: NSIS Uninstall wipes `%APPDATA%\BendLens` (`deleteAppDataOnUninstall` + `customUnInstall`); legacy-payload users run `Uninstall-BendLens.cmd` from the install dir (or `public/downloads/`). If data survives, the uninstaller was bypassed by manual folder deletion — re-run the matching uninstaller.
- **Splash Screen Stalling**: resolved via in-process `server.listen` direct callback, sequential readiness probes with 45s timeout, single-call lock on `loadStudio()`, automatic navigation retry upon `ERR_ABORTED (-3)`, and deferred duplicate install warnings.
- **Window Icon Missing**: Verify `public/icon.ico` exists. Use `scripts/generate-icons.js` to regenerate icons if missing.
- **CI/CD Windows Release (`release.yml`)**:
  - Requires `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION: 'true'` in workflow `env:` to avoid GitHub Actions runner Node 20 deprecation warnings and forced Node 24 incompatibility.
  - Requires `pnpm-workspace.yaml` to explicitly include `packages: ['- .']` so that `pnpm 9` does not fail with `packages field missing or empty` during `actions/setup-node@v4` pnpm store cache resolution (`pnpm store path`).
  - `scripts/installer.nsh` must only define `!macro customInstall` and `!macro customUnInstall` (do not define `Function .onInit` or insert duplicate `MUI_PAGE_*` macros, as electron-builder defines them internally). Use silent `nsExec::Exec 'taskkill /F /IM BendLens.exe /T'` to terminate running processes without parameter splitting or deprecated WMIC syntax errors.
  - Exclude `node_modules/electron`, `node_modules/electron-builder`, `.cache`, and `*.map` from `build.files` in `package.json` to avoid packaging ~250MB+ of redundant binaries and slow 7z compression.
  - Set `"dist": "electron-builder --win --publish never"` to prevent electron-builder from triggering implicit tag publishing, allowing the dedicated `softprops/action-gh-release@v2` step to manage the release.
