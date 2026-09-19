const fs = require('fs');
const path = require('path');

/**
 * Centralized packaged-app path resolution for BendLens.
 *
 * Problem it solves:
 * In the downloaded Electron build the Next.js engine runs in-process
 * (`require('next')` with `dir: <resources>/app`), but `process.cwd()` is
 * NOT `<resources>/app` — it is whatever directory Electron was launched
 * from. Every API route that did `path.join(process.cwd(), 'sample_project')`
 * therefore resolved to a non-existent folder on the user's machine, so the
 * app window opened fine while ALL functionalities (Sample, Analyze fallback,
 * Current, Impact fallback, version detection) returned
 * "Directory not found".
 *
 * Resolution order:
 *  1. `process.env.BENDLENS_APP_DIR` (set by electron/main.js before boot).
 *  2. Electron packaged layout: `<resources>/app` when it holds package.json.
 *  3. `process.cwd()` fallback (dev / web server).
 */

let cachedRoot = null;

function getAppRoot() {
  if (cachedRoot && fs.existsSync(/*turbopackIgnore: true*/ cachedRoot)) return cachedRoot;

  const candidates = [];

  if (process.env.BENDLENS_APP_DIR) {
    candidates.push(process.env.BENDLENS_APP_DIR);
  }

  // Electron packaged layout (asar disabled): resources/app is the engine dir.
  // process.resourcesPath exists only inside Electron; guard for plain Node.
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app'));
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked'));
    candidates.push(process.resourcesPath);
  }

  // Extracted app directory (when electron-builder creates app.asar despite asar:false)
  // On Windows: %APPDATA%/BendLens/extracted-app, on Linux/Mac: ~/.config/BendLens/extracted-app
  const userData = process.env.APPDATA || (process.env.HOME ? path.join(process.env.HOME, '.config') : '');
  if (userData) {
    candidates.push(path.join(userData, 'BendLens', 'extracted-app'));
  }

  candidates.push(process.cwd());

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c) && fs.existsSync(path.join(c, 'package.json'))) {
        cachedRoot = c;
        return cachedRoot;
      }
    } catch {}
  }

  // Last resort: first existing candidate, else cwd.
  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c)) {
        cachedRoot = c;
        return cachedRoot;
      }
    } catch {}
  }

  cachedRoot = process.cwd();
  return cachedRoot;
}

/**
 * Absolute path to the bundled demo project.
 * Probes app-root first, then Electron resource mirrors, so the Sample /
 * Current / Impact fallbacks work in portable, NSIS, and dev layouts.
 */
function getSampleProjectPath() {
  const tried = [];
  const push = (p) => {
    if (p && !tried.includes(p)) tried.push(p);
  };

  push(path.join(getAppRoot(), 'sample_project'));
  if (process.resourcesPath) {
    push(path.join(process.resourcesPath, 'app', 'sample_project'));
    push(path.join(process.resourcesPath, 'sample_project'));
  }
  push(path.join(process.cwd(), 'sample_project'));

  for (const p of tried) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  // Return the primary guess so callers surface a meaningful error.
  return tried[0];
}

module.exports = { getAppRoot, getSampleProjectPath };
