import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
const { getAppRoot } = require('@/lib/appPaths');

export const dynamic = 'force-dynamic';

/**
 * A Windows executable must start with the MZ magic bytes. Batch text renamed
 * to `.exe` (legacy build-installer output) fails this check and must never
 * be served as a download — Windows cannot execute it.
 */
function isValidWindowsExe(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return buf[0] === 0x4d && buf[1] === 0x5a;
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    const projectRoot = getAppRoot();
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
        if (!isValidWindowsExe(installerPath)) {
          console.error(`[download-app] dist installer failed MZ validation: ${installerPick} — rebuild with \`npm run dist\`.`);
        } else {
          const stat = fs.statSync(installerPath);
          const { Readable } = require('stream');
          const nodeStream = fs.createReadStream(installerPath);
          const webStream = Readable.toWeb(nodeStream);

          return new NextResponse(webStream, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.microsoft.portable-executable',
              'Content-Disposition': `attachment; filename="${installerPick}"`,
              'Content-Length': stat.size.toString(),
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }
      }
    }

    // 1. If running without local dist/ binaries, query the latest GitHub release
    // asset and redirect directly to the public download URL.
    try {
      const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const githubHeaders = {
        'User-Agent': 'BendLens-Downloader/1.0',
        ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {})
      };
      const relRes = await fetch('https://api.github.com/repos/Keerthivasan004/BendLens/releases', {
        headers: githubHeaders
      });
      if (relRes.ok) {
        const releases = await relRes.json();
        const latest = Array.isArray(releases) && releases[0];
        if (latest && Array.isArray(latest.assets)) {
          const setupAsset =
            latest.assets.find((a) => /setup.*\.exe$/i.test(a.name)) ||
            latest.assets.find((a) => /\.exe$/i.test(a.name));
          if (setupAsset?.browser_download_url) {
            return NextResponse.redirect(setupAsset.browser_download_url, 307);
          }
        }
      }
    } catch (remoteErr) {
      console.warn('[download-app] GitHub release asset fetch failed:', remoteErr.message);
    }

    // Fallback if no assets found
    return NextResponse.redirect('https://github.com/Keerthivasan004/BendLens', 307);
  } catch (error) {
    console.error('Download route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to package BendLens application' },
      { status: 500 }
    );
  }
}
