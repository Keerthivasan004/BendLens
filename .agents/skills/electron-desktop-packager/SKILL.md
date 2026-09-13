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
   - Enforces single-instance lock (`app.requestSingleInstanceLock()`).
   - Immediately loads the local lightweight splash screen (`splash.html`).
   - Resolves the engine directory (`resolveAppDir()`: packaged `<resources>/app`, dev repo root).
   - Picks a port (`resolvePort()` over `[3000, 3001, 3030, 8000, 5000]`) reusing only identity-verified BendLens servers (`isBendLensServer()` probes `/api/updates/check`).
   - Packaged mode spawns the production engine with Electron's own Node (`process.execPath` + bundled `next start`, `windowsHide: true`) — no npm on user machines; dev mode spawns `npm/pnpm run dev|start`.
   - Shows a native error dialog if the engine fails instead of loading a dead URL.
2. **Native Launcher (`scripts/BendLensLauncher.cs` → `BendLens.exe`)**:
   - Resolves installed runtime (exe dir → `%LOCALAPPDATA%\BendLens` → `%ProgramFiles%\BendLens`); no developer-path fallback.
   - Electron fast path when present; otherwise verified `npm run start` (requires runtime + Node + `.next`) with browser opened only on success, `MessageBox` guidance on failure.
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
- **Port 3000 Conflict**: handled automatically — `resolvePort()` verifies server identity and falls back to 3001/3030/8000/5000. Never attaches to a foreign service.
- **Splash Screen Stalling**: a native error dialog now appears if the engine fails; check logs by running the spawned engine command in a standalone terminal.
- **Window Icon Missing**: Verify `public/icon.ico` exists. Use `scripts/generate-icons.js` to regenerate icons if missing.
