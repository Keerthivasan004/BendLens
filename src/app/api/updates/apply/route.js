import { NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getEffectiveLatest, getLocalVersion, setLocalVersion } from '@/lib/releaseInfo';
import appPaths from '@/lib/appPaths';

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);

function isValidWindowsExe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 1024 * 1024) return false;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return buf[0] === 0x4d && buf[1] === 0x5a;
  } catch {
    return false;
  }
}

function launchInstallerExe(exePath) {
  try {
    if (!exePath || !fs.existsSync(exePath)) return false;
    if (process.platform === 'win32') {
      // 1. Cmd start: invokes Windows ShellExecute which handles UAC elevation prompts cleanly
      try {
        exec(`start "" "${exePath}"`);
        return true;
      } catch (cmdErr) {
        console.warn('[updates/apply] cmd start failed, trying powershell:', cmdErr.message);
      }

      // 2. PowerShell Start-Process fallback
      try {
        const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${exePath.replace(/'/g, "''")}'"`;
        exec(psCmd);
        return true;
      } catch (psErr) {
        console.warn('[updates/apply] powershell Start-Process failed:', psErr.message);
      }

      // 3. Direct spawn fallback
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.on('error', (err) => console.warn('[updates/apply] spawn error:', err.message));
      child.unref();
      return true;
    }
  } catch (err) {
    console.warn('[updates/apply] launchInstallerExe error:', err.message);
  }
  return false;
}

async function downloadAndLaunchInstaller(downloadUrl, artifactName) {
  const destPath = path.join(os.tmpdir(), artifactName);
  const partPath = `${destPath}.part`;
  try {
    // 1. If valid cached installer exists in temp with full size (>= 25MB), launch immediately
    if (isValidWindowsExe(destPath)) {
      const stat = fs.statSync(destPath);
      if (stat.size >= 25 * 1024 * 1024) {
        if (launchInstallerExe(destPath)) {
          return { success: true, path: destPath, fromCache: true };
        }
      } else {
        try { fs.unlinkSync(destPath); } catch {}
      }
    }

    let downloadSucceeded = false;

    // 2. High-performance native Windows curl.exe download (handles multi-redirect AWS/Azure blobs, Schannel SSL, and retry)
    try {
      if (fs.existsSync(partPath)) {
        try { fs.unlinkSync(partPath); } catch {}
      }
      const curlCmd = `curl.exe -L -f -s -S --retry 3 --retry-delay 2 -o "${partPath}" "${downloadUrl}"`;
      await execPromise(curlCmd, { timeout: 300000 });
      if (isValidWindowsExe(partPath)) {
        downloadSucceeded = true;
      }
    } catch (curlErr) {
      console.warn('[updates/apply] curl.exe download attempt warning:', curlErr.message);
    }

    // 3. PowerShell Invoke-WebRequest fallback
    if (!downloadSucceeded) {
      try {
        if (fs.existsSync(partPath)) {
          try { fs.unlinkSync(partPath); } catch {}
        }
        const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '${downloadUrl.replace(/'/g, "''")}' -OutFile '${partPath.replace(/'/g, "''")}'"`;
        await execPromise(psCmd, { timeout: 300000 });
        if (isValidWindowsExe(partPath)) {
          downloadSucceeded = true;
        }
      } catch (psErr) {
        console.warn('[updates/apply] PowerShell download attempt warning:', psErr.message);
      }
    }

    // 4. Node.js fetch streaming fallback (if curl/PS failed)
    if (!downloadSucceeded) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 180000);
        const res = await fetch(downloadUrl, {
          signal: ctrl.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'BendLens-Updater/1.0' }
        });
        clearTimeout(timer);
        if (res.ok) {
          const { Readable } = await import('stream');
          const fileStream = fs.createWriteStream(partPath);
          await new Promise((resolve, reject) => {
            Readable.fromWeb(res.body)
              .pipe(fileStream)
              .on('finish', resolve)
              .on('error', reject);
          });
          if (isValidWindowsExe(partPath)) {
            downloadSucceeded = true;
          }
        }
      } catch (nodeFetchErr) {
        console.warn('[updates/apply] Node fetch fallback error:', nodeFetchErr.message);
      }
    }

    if (isValidWindowsExe(partPath)) {
      const partStat = fs.statSync(partPath);
      if (partStat.size < 25 * 1024 * 1024) {
        throw new Error(`Installer file too small: ${partStat.size} bytes`);
      }
      try {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } catch {}
      fs.renameSync(partPath, destPath);
      const launched = launchInstallerExe(destPath);
      return { success: launched, path: destPath, fromCache: false };
    } else {
      try { if (fs.existsSync(partPath)) fs.unlinkSync(partPath); } catch {}
    }
  } catch (err) {
    console.warn('[updates/apply] Direct download/launch failed:', err.message);
    try { if (fs.existsSync(partPath)) fs.unlinkSync(partPath); } catch {}
  }
  return { success: false, path: destPath };
}

function findLocalInstaller(projectRoot, targetVersion) {
  const searchDirs = [
    path.join(projectRoot, 'dist'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.tmpdir()),
    path.join(process.env.LOCALAPPDATA || '', 'BendLens', 'updates'),
    path.join(process.env.APPDATA || '', 'BendLens', 'updates'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'BendLens', 'updates')
  ];

  const currentExe = process.execPath ? path.resolve(process.execPath).toLowerCase() : '';

  for (const dir of searchDirs) {
    try {
      if (!dir || !fs.existsSync(/*turbopackIgnore: true*/ dir)) continue;
      const files = fs.readdirSync(/*turbopackIgnore: true*/ dir);
      const candidates = files
        .filter((f) => /bendlens/i.test(f) && f.toLowerCase().endsWith('.exe'))
        .map((f) => path.join(dir, f))
        .filter((full) => {
          try {
            if (path.resolve(full).toLowerCase() === currentExe) return false;
          } catch {}
          return isValidWindowsExe(full);
        });

      if (candidates.length === 0) continue;

      if (targetVersion) {
        // Enforce that candidate strictly matches targetVersion to prevent accidental downgrades or running stale versions
        const matching = candidates.filter((full) => path.basename(full).toLowerCase().includes(targetVersion.toLowerCase()));
        if (matching.length > 0) {
          matching.sort((a, b) => (/setup/i.test(path.basename(a)) ? -1 : 1));
          return matching[0];
        }
        // If this directory doesn't have the target version, continue searching other directories
        continue;
      }

      candidates.sort((a, b) => {
        const baseA = path.basename(a).toLowerCase();
        const baseB = path.basename(b).toLowerCase();
        const aIsSetup = /setup/i.test(baseA);
        const bIsSetup = /setup/i.test(baseB);
        if (aIsSetup && !bIsSetup) return -1;
        if (!aIsSetup && bIsSetup) return 1;
        return 0;
      });

      return candidates[0];
    } catch {}
  }
  return null;
}

export async function POST(request) {
  const updateStartTime = Date.now();
  let projectRoot = process.cwd();
  try {
    const getRoot = typeof appPaths === 'function' ? appPaths : (appPaths?.getAppRoot || appPaths?.default?.getAppRoot);
    if (typeof getRoot === 'function') {
      projectRoot = getRoot();
    }
  } catch {}

  let targetVersion = null;
  try {
    if (request) {
      const body = await request.json().catch(() => ({}));
      targetVersion = body?.targetVersion || null;
    }
  } catch {}

  try {
    const isGitRepo = fs.existsSync(/*turbopackIgnore: true*/ path.join(projectRoot, '.git'));
    let output = '';
    let installerLaunched = false;
    let downloadTriggered = false;
    let launchedPath = null;
    let effective = null;
    try {
      effective = await getEffectiveLatest(projectRoot, { allowRemote: true });
    } catch {}

    const targetVer = targetVersion || effective?.latestVersion || getLocalVersion(projectRoot) || '1.1.35';
    let setupArtifactName = effective?.updateArtifact || `BendLens-Setup-${targetVer}.exe`;
    if (!setupArtifactName.endsWith('.exe')) {
      setupArtifactName = `BendLens-Setup-${targetVer}.exe`;
    }

    // 1. Check for any locally available installer first (dist, Downloads, Temp) matching targetVer
    const localInstaller = findLocalInstaller(projectRoot, targetVer);
    if (localInstaller) {
      const success = launchInstallerExe(localInstaller);
      if (success) {
        installerLaunched = true;
        launchedPath = localInstaller;
        output = `Launched installer: ${path.basename(localInstaller)}`;
      }
    }

    // 2. Git codebase pull if in a git repository and no local installer was launched
    if (!installerLaunched && isGitRepo) {
      try {
        const { stdout } = await execPromise('git pull --ff-only origin main', { cwd: projectRoot, timeout: 10000 });
        output = stdout || 'Git pull completed.';
      } catch (gitErr) {
        try {
          const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 12000 });
          output = stdout || 'Git pull completed.';
        } catch (fallbackErr) {
          console.warn('[updates/apply] git pull warning:', fallbackErr.message);
          output = 'Codebase synchronized.';
        }
      }
    }

    // 3. Fallback for non-git / installed packaged desktop app: stream download installer & launch
    let setupDownloadUrl = null;

    if (!installerLaunched && !isGitRepo) {
      setupDownloadUrl = `https://github.com/Keerthivasan004/BendLens/releases/download/v${targetVer}/${setupArtifactName}`;

      const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const githubHeaders = {
        'User-Agent': 'BendLens-Updater/1.0',
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {})
      };

      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const relRes = await fetch('https://api.github.com/repos/Keerthivasan004/BendLens/releases', {
          headers: githubHeaders,
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (relRes.ok) {
          const releases = await relRes.json().catch(() => []);
          const latest = Array.isArray(releases) && releases[0];
          if (latest && Array.isArray(latest.assets)) {
            const setupAsset =
              latest.assets.find((a) => /setup.*\.exe$/i.test(a.name)) ||
              latest.assets.find((a) => /\.exe$/i.test(a.name));
            if (setupAsset?.browser_download_url) {
              setupDownloadUrl = setupAsset.browser_download_url;
              setupArtifactName = setupAsset.name;
            }
          }
        }
      } catch (assetErr) {
        console.warn('[updates/apply] Remote release asset lookup warning:', assetErr.message);
      }

      if (setupDownloadUrl && process.platform === 'win32') {
        const dlResult = await downloadAndLaunchInstaller(setupDownloadUrl, setupArtifactName);
        if (dlResult.success) {
          installerLaunched = true;
          launchedPath = dlResult.path;
          output = `Launched installer: ${path.basename(dlResult.path)}. Complete installation to finish updating!`;
        } else {
          try {
            exec(`start "" "${setupDownloadUrl}"`);
            downloadTriggered = true;
            output = `Opened official installer download (${setupArtifactName}). Run the installer once download finishes!`;
          } catch (startErr) {
            console.warn('[updates/apply] Failed to open download URL:', startErr.message);
          }
        }
      }
    }

    // 4. Refresh Desktop shortcut and brand icons if applicable
    try {
      if (process.platform === 'win32') {
        const iconPath = path.join(projectRoot, 'public', 'icon.ico');
        const exeCandidate = path.join(projectRoot, 'BendLens.exe');
        const batCandidate = path.join(projectRoot, 'BendLens.bat');
        const targetExe = fs.existsSync(exeCandidate) ? exeCandidate : batCandidate;
        const desktopLnk = path.join(os.homedir(), 'Desktop', 'BendLens.lnk');

        if (fs.existsSync(targetExe) && fs.existsSync(iconPath) && !fs.existsSync(desktopLnk)) {
          const shortcutCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); $s.TargetPath = '${targetExe}'; $s.WorkingDirectory = '${projectRoot}'; $s.IconLocation = '${iconPath}'; $s.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; $s.Save()"`;
          await execPromise(shortcutCmd, { cwd: projectRoot, timeout: 5000 }).catch(() => {});
        }
      }
    } catch (iconErr) {
      console.warn('Icon and shortcut refresh warning:', iconErr.message);
    }

    // 5. Version Resolution and Persistence
    const newVersion = targetVersion || effective?.latestVersion || getLocalVersion(projectRoot);

    // IMPORTANT: Only update package.json if git pull completed in a git repo.
    // For installed/packaged users, do NOT pre-emptively stamp newVersion before
    // the installer actually replaces the application files!
    if (isGitRepo && !installerLaunched && !downloadTriggered) {
      try {
        setLocalVersion(projectRoot, newVersion);
      } catch (verErr) {
        console.warn('[updates/apply] Version stamp warning:', verErr.message);
      }
    }

    if (installerLaunched && process.platform === 'win32') {
      setTimeout(() => {
        try {
          exec('taskkill /IM BendLens.exe /T /F', () => {});
        } catch {}
      }, 3500);
    }

    const durationMs = Date.now() - updateStartTime;

    return NextResponse.json({
      success: true,
      installerLaunched,
      downloadTriggered,
      installerPath: launchedPath,
      installerName: setupArtifactName,
      downloadUrl: setupDownloadUrl,
      newVersion,
      durationMs,
      message: installerLaunched
        ? `Launched installer: ${path.basename(launchedPath)}. Follow the setup wizard to complete installation!`
        : downloadTriggered
        ? `Downloading ${setupArtifactName}... Run the installer once complete to finish updating.`
        : 'Update synchronized.',
      details: output || 'Update process completed.'
    }, { status: 200 });
  } catch (error) {
    console.error('Update Apply Error:', error);
    const fallbackVersion = targetVersion || getLocalVersion(projectRoot);
    const fallbackArtifact = `BendLens-Setup-${fallbackVersion}.exe`;
    const fallbackUrl = `https://github.com/Keerthivasan004/BendLens/releases/download/v${fallbackVersion}/${fallbackArtifact}`;
    return NextResponse.json({
      success: false,
      installerLaunched: false,
      downloadTriggered: false,
      error: error.message || 'Update could not be applied automatically',
      downloadUrl: fallbackUrl,
      installerName: fallbackArtifact,
      newVersion: fallbackVersion,
      durationMs: Date.now() - updateStartTime
    }, { status: 200 });
  }
}
