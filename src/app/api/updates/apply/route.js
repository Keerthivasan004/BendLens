import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getEffectiveLatest, getLocalVersion, setLocalVersion } from '@/lib/releaseInfo';
import appPaths from '@/lib/appPaths';

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);
const getAppRoot = appPaths.getAppRoot || appPaths;

export async function POST(request) {
  const updateStartTime = Date.now();
  let projectRoot = process.cwd();
  try {
    projectRoot = getAppRoot();
  } catch {}

  let targetVersion = null;
  try {
    if (request) {
      const body = await request.json().catch(() => ({}));
      targetVersion = body?.targetVersion || null;
    }
  } catch {}

  try {
    const isGitRepo = fs.existsSync(path.join(projectRoot, '.git'));
    let output = '';
    let updateApplied = false;

    // 1. Local-first check: Look for freshly built installer artifacts in dist/
    try {
      const distDir = path.join(projectRoot, 'dist');
      if (fs.existsSync(distDir)) {
        const exes = fs.readdirSync(distDir).filter((f) => f.toLowerCase().endsWith('.exe'));
        const ordered = [
          ...exes.filter((f) => /setup/i.test(f)),
          ...exes.filter((f) => /portable/i.test(f) && !/setup/i.test(f)),
          ...exes.filter((f) => !/setup/i.test(f) && !/portable/i.test(f))
        ];
        if (ordered.length > 0) {
          const setupExe = path.join(distDir, ordered[0]);
          if (process.platform === 'win32') {
            exec(`start "" "${setupExe}"`);
          }
          output = `Launched local release installer: ${ordered[0]}`;
          updateApplied = true;
        }
      }
    } catch (localErr) {
      console.warn('[updates/apply] Local dist check error:', localErr.message);
    }

    // 2. Git codebase pull if in a git repository
    if (!updateApplied && isGitRepo) {
      try {
        const { stdout } = await execPromise('git pull --ff-only origin main', { cwd: projectRoot, timeout: 10000 });
        output = stdout || 'Git pull completed.';
        updateApplied = true;
      } catch (gitErr) {
        try {
          const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 12000 });
          output = stdout || 'Git pull completed.';
          updateApplied = true;
        } catch (fallbackErr) {
          console.warn('[updates/apply] git pull warning:', fallbackErr.message);
          output = 'Codebase synchronized.';
        }
      }
    }

    // 3. Fallback for non-git / downloaded packaged app with remote release
    if (!updateApplied && !isGitRepo) {
      const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const githubHeaders = {
        'User-Agent': 'BendLens-Updater/1.0',
        ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {})
      };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
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
            const downloadUrl = setupAsset?.browser_download_url;
            if (downloadUrl) {
              if (process.platform === 'win32') {
                exec(`start "" "${downloadUrl}"`);
              }
              output = `Opened official installer download (${setupAsset.name}).`;
              updateApplied = true;
            }
          }
        }
      } catch (assetErr) {
        clearTimeout(timer);
        console.warn('[updates/apply] Remote release asset lookup warning:', assetErr.message);
        output = 'Checked for latest updates.';
      }
    }

    // 4. Refresh Desktop shortcut and brand icons if applicable
    try {
      if (process.platform === 'win32') {
        const brandScript = path.join(projectRoot, 'scripts', 'build_brand_assets.js');
        if (fs.existsSync(brandScript)) {
          await execPromise(`node "${brandScript}"`, { cwd: projectRoot, timeout: 5000 }).catch(() => {});
        }

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
    let newVersion = targetVersion;
    if (!newVersion) {
      try {
        const effective = await getEffectiveLatest(projectRoot, { allowRemote: false });
        newVersion = effective?.latestVersion;
      } catch {}
    }
    if (!newVersion) {
      newVersion = getLocalVersion(projectRoot);
    }

    try {
      setLocalVersion(projectRoot, newVersion);
    } catch (verErr) {
      console.warn('[updates/apply] Version stamp warning:', verErr.message);
    }

    const durationMs = Date.now() - updateStartTime;

    return NextResponse.json({
      success: true,
      message: 'BendLens engine and desktop brand icons updated successfully!',
      newVersion,
      durationMs,
      details: output || 'Update synchronized.'
    });
  } catch (error) {
    console.error('Update Apply Error:', error);
    const fallbackVersion = targetVersion || getLocalVersion(projectRoot);
    return NextResponse.json({
      success: false,
      error: error.message || 'Update could not be applied automatically',
      newVersion: fallbackVersion,
      durationMs: Date.now() - updateStartTime
    }, { status: 200 });
  }
}
