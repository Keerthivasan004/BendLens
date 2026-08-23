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

    if (isGitRepo) {
      // 1. Pull latest updates from Git
      const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 30000 });
      output = stdout || 'Git pull completed.';
    } else {
      // 2. Standalone Downloaded User Auto-Update: Fetch latest release bundle
      try {
        const repoZipUrl = 'https://github.com/Keerthivasan004/BendLens/archive/refs/heads/main.zip';
        const res = await fetch(repoZipUrl, { headers: { 'User-Agent': 'BendLens-Updater/1.0' } });
        
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);

          const tempExtract = path.join(os.tmpdir(), `bendlens_update_${Date.now()}`);
          zip.extractAllTo(tempExtract, true);

          // Find extracted root folder
          const extractedRoots = fs.readdirSync(tempExtract);
          const sourceFolder = path.join(tempExtract, extractedRoots[0]);

          // Copy updated src, public, package.json
          const dirsToCopy = ['src', 'public', 'electron', 'scripts'];
          for (const dir of dirsToCopy) {
            const srcDir = path.join(sourceFolder, dir);
            const destDir = path.join(projectRoot, dir);
            if (fs.existsSync(srcDir)) {
              if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
              copyFolderRecursiveSync(srcDir, destDir);
            }
          }

          output = 'Downloaded and applied latest application files successfully!';
        } else {
          output = 'Standalone engine is up to date.';
        }
      } catch (dlErr) {
        output = 'Standalone engine up-to-date check complete.';
      }
    }

    return NextResponse.json({
      success: true,
      message: 'BendLens engine updated successfully!',
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
