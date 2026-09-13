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
   - Manages application lifecycle and native window creation.
   - Enforces single-instance lock (`app.requestSingleInstanceLock()`).
   - Immediately loads the local lightweight splash screen (`splash.html`).
   - Concurrently checks for a running Next.js instance on port 3000; if missing, it spawns `npm run dev` in the background.
   - Navigates `mainWindow` to `http://127.0.0.1:3000` once the server responds with `200 OK`.
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
| Build Windows Installer | `npm run dist` |
| Generate Desktop Icons | `node scripts/generate-icons.js` |

---

## Troubleshooting Checklist
- **Port 3000 Conflict**: If another service occupies port 3000, `electron/main.js` will attempt to connect to it. Ensure port 3000 is dedicated to BendLens.
- **Splash Screen Stalling**: Check if Next.js failed to start by running `npm run dev` in a standalone terminal to inspect error logs.
- **Window Icon Missing**: Verify `public/icon.ico` exists. Use `scripts/generate-icons.js` to regenerate icons if missing.
