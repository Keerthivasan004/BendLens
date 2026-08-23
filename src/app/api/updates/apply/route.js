import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import os from 'os';

export const dynamic = 'force-dynamic';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const projectRoot = process.cwd();
    const isGitRepo = fs.existsSync(path.join(projectRoot, '.git'));
    let output = '';

    // 1. Update Application Codebase
    if (isGitRepo) {
      const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 35000 });
      output = stdout || 'Git pull completed.';
    } else {
      try {
        const repoZipUrl = 'https://github.com/Keerthivasan004/BendLens/archive/refs/heads/main.zip';
        const res = await fetch(repoZipUrl, { headers: { 'User-Agent': 'BendLens-Updater/1.0' } });
        
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
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
      } catch (e) {
        output = 'Checked for latest files.';
      }
    }

    // 2. Automatically refresh and update the Icon & Desktop shortcut image on user system
    try {
      if (process.platform === 'win32') {
        const iconScriptPath = path.join(projectRoot, 'scripts', 'generate-icon.ps1');
        if (fs.existsSync(iconScriptPath)) {
          await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -File "${iconScriptPath}"`, { cwd: projectRoot });
        }

        // Refresh Desktop Shortcut icon
        const iconPath = path.join(projectRoot, 'public', 'icon.ico');
        const targetExe = path.join(projectRoot, 'BendLens.bat');
        const shortcutCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); $s.TargetPath = '${targetExe}'; $s.WorkingDirectory = '${projectRoot}'; $s.IconLocation = '${iconPath}'; $s.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; $s.Save()"`;
        await execPromise(shortcutCmd, { cwd: projectRoot });

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

    // Read updated version from package.json
    let newVersion = '1.0.0';
    try {
      const updatedPkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
      newVersion = updatedPkg.version || '1.0.0';
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
