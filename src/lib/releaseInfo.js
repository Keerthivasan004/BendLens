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

export const BASELINE_LATEST_VERSION = '1.1.41';

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
  if (typeof process !== 'undefined' && process.env && process.env.BENDLENS_APP_VERSION) {
    return String(process.env.BENDLENS_APP_VERSION);
  }
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
  return BASELINE_LATEST_VERSION;
}

export function setLocalVersion(projectRootOrVersion, maybeVersion) {
  const version = maybeVersion !== undefined ? maybeVersion : projectRootOrVersion;
  const projectRoot = maybeVersion !== undefined ? projectRootOrVersion : undefined;
  try {
    const root = resolveRoot(projectRoot);
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkg.version = String(version);
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

// --- Remote release discovery (downloaded desktop apps) ---
//
// A packaged desktop install has no `dist/` folder, so purely local
// detection could never announce a release to it. For desktop clients the
// check endpoint therefore reads GitHub release tags and assets using the
// secure repository release token.
// Fully offline environments fall back seamlessly to local detection.
const UPDATE_REPO = 'Keerthivasan004/BendLens';
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const REMOTE_TTL_MS = 10 * 60 * 1000;
let remoteCache = { at: 0, version: null, asset: null };

export async function getRemoteLatestRelease() {
  const now = Date.now();
  if (remoteCache?.version && now - remoteCache.at < REMOTE_TTL_MS) {
    return { version: remoteCache.version, asset: remoteCache.asset };
  }
  let timer;
  try {
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), 6000);
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BendLens-Updater/1.0'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases`, {
      headers,
      signal: ctrl.signal
    });
    if (timer) clearTimeout(timer);
    if (!res.ok) return { version: remoteCache?.version || null, asset: remoteCache?.asset || null };
    const releases = await res.json().catch(() => []);
    if (Array.isArray(releases) && releases.length > 0) {
      const newest = releases[0];
      const tagVersion = parseArtifactVersion(newest?.tag_name || newest?.name || '');
      let assetName = null;
      let assetVersion = null;
      let downloadUrl = null;
      if (Array.isArray(newest?.assets)) {
        const setupAsset =
          newest.assets.find((a) => /setup.*\.exe$/i.test(a?.name)) ||
          newest.assets.find((a) => /\.exe$/i.test(a?.name));
        if (setupAsset) {
          assetName = setupAsset.name;
          assetVersion = parseArtifactVersion(setupAsset.name);
          downloadUrl = setupAsset.browser_download_url || null;
        }
      }
      // Use the newest version between the release tag and the asset filename
      // so published releases are never suppressed even if an asset had a stale name.
      const v = maxVersion(tagVersion, assetVersion);
      if (v) {
        if (!downloadUrl) {
          downloadUrl = `https://github.com/${UPDATE_REPO}/releases/download/v${v}/${assetName || `BendLens-Setup-${v}.exe`}`;
        }
        remoteCache = { at: now, version: v, asset: assetName, downloadUrl };
        return { version: v, asset: assetName, downloadUrl };
      }
    }
    return { version: remoteCache?.version || null, asset: remoteCache?.asset || null, downloadUrl: remoteCache?.downloadUrl || null };
  } catch {
    if (timer) clearTimeout(timer);
    return { version: remoteCache?.version || null, asset: remoteCache?.asset || null, downloadUrl: remoteCache?.downloadUrl || null };
  }
}

export async function getRemoteLatestVersion() {
  const rel = await getRemoteLatestRelease();
  return rel?.version || null;
}

/**
 * Effective newest release: max(local dist-scan, remote tag when allowed).
 * Returns { latestVersion, updateArtifact, updateSource }.
 */
export async function getEffectiveLatest(projectRoot, { allowRemote = false } = {}) {
  const local = getLatestRelease(projectRoot) || { latestVersion: BASELINE_LATEST_VERSION, updateArtifact: null };
  if (!allowRemote) return { ...local, updateSource: 'local', downloadUrl: null };
  try {
    const remote = await getRemoteLatestRelease();
    if (remote?.version) {
      const isNewer = isNewerVersion(remote.version, local.latestVersion);
      const bestVersion = isNewer ? remote.version : local.latestVersion;
      const asset = remote.asset || local.updateArtifact || null;
      const downloadUrl = remote.downloadUrl || null;
      return {
        latestVersion: bestVersion,
        updateArtifact: asset,
        updateSource: isNewer ? 'remote' : 'local',
        downloadUrl
      };
    }
  } catch {}
  return { ...local, updateSource: 'local', downloadUrl: null };
}
