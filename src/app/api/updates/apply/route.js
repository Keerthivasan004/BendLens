import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import os from 'os';
import { getEffectiveLatest } from '@/lib/releaseInfo';
const { getAppRoot } = require('@/lib/appPaths');

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const projectRoot = getAppRoot();
    const isGitRepo = fs.existsSync(path.join(projectRoot, '.git'));
    let output = '';

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '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';

    // 1. Update Application Codebase
    if (isGitRepo) {
      const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 35000 });
      output = stdout || 'Git pull completed.';
    } else {
      try {
        let updateApplied = false;

        // Try downloading official installer setup asset first
        try {
          const relRes = await fetch('https://api.github.com/repos/Keerthivasan004/BendLens/releases', {
            headers: {
              'User-Agent': 'BendLens-Updater/1.0',
              'Authorization': `Bearer ${GITHUB_TOKEN}`
            }
          });
          if (relRes.ok) {
            const releases = await relRes.json();
            const latest = Array.isArray(releases) && releases[0];
            if (latest && Array.isArray(latest.assets)) {
              const setupAsset = latest.assets.find((a) => /setup.*\.exe$/i.test(a.name));
              if (setupAsset) {
                const assetRes = await fetch(setupAsset.url, {
                  headers: {
                    'User-Agent': 'BendLens-Updater/1.0',
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/octet-stream'
                  }
                });
                if (assetRes.ok) {
                  const installerBuf = Buffer.from(await assetRes.arrayBuffer());
                  const tempSetup = path.join(os.tmpdir(), `BendLens-Update-Setup.exe`);
                  fs.writeFileSync(tempSetup, installerBuf);
                  exec(`start "" "${tempSetup}"`);
                  output = 'Downloaded and launched latest BendLens installer successfully.';
                  updateApplied = true;
                }
              }
            }
          }
        } catch (assetErr) {
          console.warn('[updates/apply] Release asset fetch failed:', assetErr.message);
        }

        // Fallback: download source zipball with token
        if (!updateApplied) {
          const zipballUrl = 'https://api.github.com/repos/Keerthivasan004/BendLens/zipball/main';
          let zipRes = await fetch(zipballUrl, {
            headers: {
              'User-Agent': 'BendLens-Updater/1.0',
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json'
            },
            redirect: 'follow'
          });

          if (zipRes.ok) {
            const arrayBuffer = await zipRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const zip = new AdmZip(buffer);

            const tempExtract = path.join(os.tmpdir(), `bendlens_update_${Date.now()}`);
            zip.extractAllTo(tempExtract, true);

            const extractedRoots = fs.readdirSync(tempExtract);
            const sourceFolder = path.join(tempExtract, extractedRoots[0]);

            const dirsToCopy = ['src', 'public', 'electron', 'scripts'];
            for (const dir of dirsToCopy) {
              const srcDir = path.join(sourceFolder, dir);
              const destDir = path.join(projectRoot, dir);
              if (fs.existsSync(srcDir)) {
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                copyFolderRecursiveSync(srcDir, destDir);
              }
            }
            output = 'Downloaded and applied latest application files successfully.';
          }
        }
      } catch (e) {
        output = 'Checked for latest files: ' + e.message;
      }
    }

    // 2. Automatically refresh and update the Icon & Desktop shortcut image on user system.
    try {
      if (process.platform === 'win32') {
        const brandScript = path.join(projectRoot, 'scripts', 'build_brand_assets.js');
        if (fs.existsSync(brandScript)) {
          await execPromise(`node "${brandScript}"`, { cwd: projectRoot });
        }

        // Refresh Desktop Shortcut icon
        const iconPath = path.join(projectRoot, 'public', 'icon.ico');
        const exeCandidate = path.join(projectRoot, 'BendLens.exe');
        const batCandidate = path.join(projectRoot, 'BendLens.bat');
        const targetExe = fs.existsSync(exeCandidate) ? exeCandidate : batCandidate;

        if (fs.existsSync(targetExe) && fs.existsSync(iconPath)) {
          const shortcutCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); $s.TargetPath = '${targetExe}'; $s.WorkingDirectory = '${projectRoot}'; $s.IconLocation = '${iconPath}'; $s.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; $s.Save()"`;
          await execPromise(shortcutCmd, { cwd: projectRoot });
        }

        // Recompile BendLens.exe with updated icon if CSC compiler is present
        const cscCompiler = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
        const csSource = path.join(projectRoot, 'scripts', 'BendLensLauncher.cs');
        const outExe = path.join(projectRoot, 'public', 'downloads', 'BendLens.exe');
        if (fs.existsSync(cscCompiler) && fs.existsSync(csSource)) {
          await execPromise(`"${cscCompiler}" /target:winexe /win32icon:"${iconPath}" /platform:anycpu /optimize+ /out:"${outExe}" "${csSource}" /reference:System.Windows.Forms.dll,System.Drawing.dll,System.dll,Microsoft.CSharp.dll`, { cwd: projectRoot });
          fs.copyFileSync(outExe, path.join(projectRoot, 'BendLens.exe'));
        }
      }
    } catch (iconErr) {
      console.warn('Icon and shortcut refresh warning:', iconErr.message);
    }

    // Persist the detected latest version to package.json (was a hardcoded
    // '1.1.0' that could drift from the actual release being applied).
    // Remote-aware (cached): a packaged install applying GitHub files must
    // stamp the release it actually pulled, not the local baseline.
    let newVersion = (await getEffectiveLatest(projectRoot, { allowRemote: true })).latestVersion;
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      updatedPkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(updatedPkg, null, 2), 'utf-8');
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'BendLens engine and desktop brand icons updated successfully!',
      newVersion,
      details: output
    });
  } catch (error) {
    console.error('Update Apply Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to automatically apply update'
    }, { status: 500 });
  }
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}
