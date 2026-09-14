import path from 'path';
import fs from 'fs';

function resolveRoot(projectRoot) {
  if (projectRoot) return projectRoot;
  if (typeof process !== 'undefined' && process.env && process.env.BENDLENS_APP_DIR) {
    return process.env.BENDLENS_APP_DIR;
  }
  // Electron packaged fallback: resources/app holds package.json + dist metadata.
  try {
    if (typeof process !== 'undefined' && process.resourcesPath) {
      const resApp = path.join(process.resourcesPath, 'app');
      if (fs.existsSync(path.join(resApp, 'package.json'))) return resApp;
    }
  } catch {}
  return process.cwd();
}

/**
 * Single source of truth for BendLens release/update detection.
 *
 * Air-gapped design: there is NO remote update server (zero cloud leakage).
 * A "new release" is a freshly built electron-builder installer dropped into
 * `dist/` (e.g. `BendLens-Setup-1.2.0.exe`). The check endpoint compares the
 * installed `package.json` version against the newest artifact version found
 * on disk, falling back to the bundled baseline. `?simulate=true` forces an
 * update signal for testing the notification UI end-to-end.
 */

export const BASELINE_LATEST_VERSION = '1.1.0';

/** Extract a semver triple from an installer filename, or null. */
export function parseArtifactVersion(filename) {
  const m = String(filename || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}` : null;
}

export function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const r = String(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const l = String(local).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

/** Newest of two versions (null-safe). */
export function maxVersion(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return isNewerVersion(b, a) ? b : a;
}

export function getLocalVersion(projectRoot) {
  try {
    const root = resolveRoot(projectRoot);
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.version) return String(pkg.version);
    }
  } catch (err) {
    console.warn('Could not read package.json version:', err.message);
  }
  return '1.0.0';
}

export function setLocalVersion(projectRoot, version) {
  try {
    const root = resolveRoot(projectRoot);
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.version = version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
      return true;
    }
  } catch (err) {
    console.error('Could not write package.json version:', err.message);
  }
  return false;
}

/**
 * Newest released version visible to this installation.
 * Scans `dist/*.exe` installer artifacts (Setup preferred, then Portable)
 * and falls back to the bundled baseline constant.
 * Returns { latestVersion, updateArtifact } — artifact is the installer
 * filename carrying the newest version, or null when baseline wins.
 */
export function getLatestRelease(projectRoot) {
  const root = resolveRoot(projectRoot);
  let latestVersion = BASELINE_LATEST_VERSION;
  let updateArtifact = null;
  try {
    const distDir = path.join(root, 'dist');
    if (fs.existsSync(distDir)) {
      const exes = fs.readdirSync(distDir).filter((f) => f.toLowerCase().endsWith('.exe'));
      // Prefer Setup installers, then Portable, then any BendLens exe.
      const ordered = [
        ...exes.filter((f) => /setup/i.test(f)),
        ...exes.filter((f) => /portable/i.test(f) && !/setup/i.test(f)),
        ...exes.filter((f) => !/setup/i.test(f) && !/portable/i.test(f))
      ];
      for (const file of ordered) {
        const v = parseArtifactVersion(file);
        if (v && isNewerVersion(v, latestVersion)) {
          latestVersion = v;
          updateArtifact = file;
        }
      }
    }
  } catch (err) {
    console.warn('Could not scan dist/ for release artifacts:', err.message);
  }
  return { latestVersion, updateArtifact };
}

// --- Remote release discovery (downloaded desktop apps only) ---
//
// A packaged desktop install has no `dist/` folder, so purely local
// detection can never announce a release to it. For desktop clients the
// check endpoint therefore ALSO reads the public GitHub release tag
// (version metadata only — no source code or schemas ever leave the
// machine, consistent with the existing apply-route GitHub fetch).
// Fully offline/blocked environments fall back to local detection.
// Web clients never take this path (their UI is update-gated).
const UPDATE_REPO = 'Keerthivasan004/BendLens';
const REMOTE_TTL_MS = 10 * 60 * 1000;
let remoteCache = { at: 0, version: null };

export async function getRemoteLatestVersion() {
  const now = Date.now();
  if (remoteCache.version && now - remoteCache.at < REMOTE_TTL_MS) {
    return remoteCache.version;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'BendLens-Updater/1.0' },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) return remoteCache.version;
    const json = await res.json().catch(() => ({}));
    const v = parseArtifactVersion(json.tag_name || json.name || '');
    if (v) remoteCache = { at: now, version: v };
    return v || remoteCache.version;
  } catch {
    return remoteCache.version;
  }
}

/**
 * Effective newest release: max(local dist-scan, remote tag when allowed).
 * Returns { latestVersion, updateArtifact, updateSource }.
 */
export async function getEffectiveLatest(projectRoot, { allowRemote = false } = {}) {
  const local = getLatestRelease(projectRoot);
  if (!allowRemote) return { ...local, updateSource: 'local' };
  const remote = await getRemoteLatestVersion();
  if (remote && isNewerVersion(remote, local.latestVersion)) {
    return { latestVersion: remote, updateArtifact: null, updateSource: 'remote' };
  }
  return { ...local, updateSource: 'local' };
}
