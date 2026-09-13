import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const projectRoot = process.cwd();
    const distDir = path.join(projectRoot, 'dist');

    // 0. Prefer a real packaged installer (produced by `npm run dist`):
    //    NSIS setup first, then portable exe. This is the true native app —
    //    embedded server, no browser or localhost tab required.
    if (fs.existsSync(distDir)) {
      const distFiles = fs.readdirSync(distDir).filter((f) => f.toLowerCase().endsWith('.exe'));
      const installerPick =
        distFiles.find((f) => /setup/i.test(f)) ||
        distFiles.find((f) => /portable/i.test(f)) ||
        distFiles.find((f) => /^bendlens.*\.exe$/i.test(f));
      if (installerPick) {
        const installerPath = path.join(distDir, installerPick);
        const fileBuffer = fs.readFileSync(installerPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.microsoft.portable-executable',
            'Content-Disposition': `attachment; filename="${installerPick}"`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
    }

    const exePath = path.join(projectRoot, 'public', 'downloads', 'BendLens.exe');
    const rootExePath = path.join(projectRoot, 'BendLens.exe');

    // 1. If compiled BendLens.exe exists in public/downloads or root, serve it directly
    if (fs.existsSync(exePath)) {
      const fileBuffer = fs.readFileSync(exePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.microsoft.portable-executable',
          'Content-Disposition': 'attachment; filename="BendLens.exe"',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    if (fs.existsSync(rootExePath)) {
      const fileBuffer = fs.readFileSync(rootExePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.microsoft.portable-executable',
          'Content-Disposition': 'attachment; filename="BendLens.exe"',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // 2. On Windows local runtime, compile if CSC is available
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const cscCompiler = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
        const csSource = path.join(projectRoot, 'scripts', 'BendLensLauncher.cs');
        const iconPath = path.join(projectRoot, 'public', 'icon.ico');
        
        if (fs.existsSync(cscCompiler) && fs.existsSync(csSource)) {
          const iconFlag = fs.existsSync(iconPath) ? `/win32icon:"${iconPath}"` : '';
          execSync(`"${cscCompiler}" /target:winexe ${iconFlag} /platform:anycpu /optimize+ /out:"${exePath}" "${csSource}" /reference:System.Windows.Forms.dll,System.Drawing.dll,System.dll,Microsoft.CSharp.dll`, { cwd: projectRoot });
          
          if (fs.existsSync(exePath)) {
            const fileBuffer = fs.readFileSync(exePath);
            return new NextResponse(fileBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'application/vnd.microsoft.portable-executable',
                'Content-Disposition': 'attachment; filename="BendLens.exe"',
                'Content-Length': fileBuffer.length.toString()
              }
            });
          }
        }
      } catch (compileErr) {
        console.warn('CSC compile error:', compileErr.message);
      }
    }

    // 3. Fallback: Standalone Portable Desktop Bundle
    const zip = new AdmZip();
    const DIRS = ['src', 'public', 'electron', 'scripts', 'sample_project'];
    const FILES = ['BendLens.bat', 'package.json', 'README.md', 'tailwind.config.js', 'next.config.js'];

    for (const dir of DIRS) {
      const p = path.join(projectRoot, dir);
      if (fs.existsSync(p)) zip.addLocalFolder(p, dir);
    }
    for (const f of FILES) {
      const p = path.join(projectRoot, f);
      if (fs.existsSync(p)) zip.addLocalFile(p);
    }

    const zipBuffer = zip.toBuffer();
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="BendLens-Desktop.zip"',
        'Content-Length': zipBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Download route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to package BendLens application' },
      { status: 500 }
    );
  }
}
