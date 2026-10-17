import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getEffectiveLatest, parseArtifactVersion } from '@/lib/releaseInfo';

export const dynamic = 'force-dynamic';

const downloadState = {
  status: 'idle', // 'idle' | 'downloading' | 'ready' | 'error'
  version: null,
  artifactName: null,
  downloadUrl: null,
  installerPath: null,
  progress: {
    percent: 0,
    transferredMb: '0',
    totalMb: '0',
    speedMb: '0'
  },
  error: null
};

let activeStream = null;

function isValidWindowsExe(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 25 * 1024 * 1024) return false;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    return buf[0] === 0x4d && buf[1] === 0x5a; // 'MZ' magic bytes
  } catch {
    return false;
  }
}

function getUpdateDirs() {
  const dirs = [
    path.join(process.env.APPDATA || '', 'BendLens', 'pending-update'),
    path.join(process.env.APPDATA || '', 'bendlens-platform', 'pending-update'),
    path.join(os.tmpdir())
  ];
  return dirs;
}

function findExistingInstaller(targetVersion, artifactName) {
  for (const dir of getUpdateDirs()) {
    try {
      if (!fs.existsSync(dir)) continue;
      const targetPath = path.join(dir, artifactName);
      if (isValidWindowsExe(targetPath)) return targetPath;

      const files = fs.readdirSync(dir);
      const match = files.find(f => /bendlens.*setup/i.test(f) && f.toLowerCase().endsWith('.exe') && (targetVersion ? f.includes(targetVersion) : true));
      if (match) {
        const full = path.join(dir, match);
        if (isValidWindowsExe(full)) return full;
      }
    } catch {}
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version');
  const artifact = searchParams.get('artifact') || `BendLens-Setup-${version}.exe`;

  if (version) {
    const existing = findExistingInstaller(version, artifact);
    if (existing) {
      downloadState.status = 'ready';
      downloadState.version = version;
      downloadState.installerPath = existing;
      downloadState.progress = { percent: 100, transferredMb: 'Ready', totalMb: 'Ready', speedMb: '0' };
      return NextResponse.json({ success: true, ...downloadState });
    }
  }

  return NextResponse.json({ success: true, ...downloadState });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const effective = await getEffectiveLatest(undefined, { allowRemote: true }).catch(() => null);
    const targetVersion = body.version || effective?.latestVersion || '1.1.49';
    const artifactName = body.artifactName || effective?.updateArtifact || `BendLens-Setup-${targetVersion}.exe`;
    const downloadUrl = body.downloadUrl || effective?.downloadUrl || `https://github.com/Keerthivasan004/BendLens/releases/download/v${targetVersion}/${artifactName}`;

    // 1. Check if installer already exists and is verified
    const existing = findExistingInstaller(targetVersion, artifactName);
    if (existing) {
      downloadState.status = 'ready';
      downloadState.version = targetVersion;
      downloadState.installerPath = existing;
      downloadState.progress = { percent: 100, transferredMb: 'Ready', totalMb: 'Ready', speedMb: '0' };
      return NextResponse.json({ success: true, ...downloadState });
    }

    // 2. If already downloading, return current progress
    if (downloadState.status === 'downloading' && downloadState.version === targetVersion) {
      return NextResponse.json({ success: true, ...downloadState });
    }

    // 3. Initiate non-blocking streaming background download into %APPDATA%\bendlens-platform\pending-update
    const primaryDir = path.join(process.env.APPDATA || '', 'bendlens-platform', 'pending-update');
    try {
      if (!fs.existsSync(primaryDir)) fs.mkdirSync(primaryDir, { recursive: true });
    } catch {}

    const destPath = path.join(primaryDir, artifactName);
    const partPath = `${destPath}.part`;

    downloadState.status = 'downloading';
    downloadState.version = targetVersion;
    downloadState.artifactName = artifactName;
    downloadState.downloadUrl = downloadUrl;
    downloadState.installerPath = null;
    downloadState.error = null;
    downloadState.progress = { percent: 0, transferredMb: '0', totalMb: '0', speedMb: '0' };

    // Background asynchronous execution — returns immediately to the client
    (async () => {
      try {
        if (fs.existsSync(partPath)) {
          try { fs.unlinkSync(partPath); } catch {}
        }

        const res = await fetch(downloadUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'BendLens-Updater/1.0',
            Accept: 'application/octet-stream, */*'
          }
        });

        if (!res.ok) {
          throw new Error(`Download server responded with HTTP ${res.status}`);
        }

        const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
        let downloadedBytes = 0;
        let lastReportTime = Date.now();
        let lastDownloadedBytes = 0;

        const { Readable } = await import('stream');
        const fileStream = fs.createWriteStream(partPath);

        const reader = res.body.getReader();
        const readableNodeStream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                downloadedBytes += value.length;
                const now = Date.now();
                if (now - lastReportTime >= 250 || (totalBytes > 0 && downloadedBytes >= totalBytes)) {
                  const timeDiffSec = Math.max(0.001, (now - lastReportTime) / 1000);
                  const bytesDiff = downloadedBytes - lastDownloadedBytes;
                  const speedBps = bytesDiff / timeDiffSec;
                  const speedMb = (speedBps / (1024 * 1024)).toFixed(1);
                  const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
                  const downloadedMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
                  const totalMb = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : 'Unknown';

                  downloadState.progress = {
                    percent,
                    transferredMb: downloadedMb,
                    totalMb,
                    speedMb
                  };
                  lastReportTime = now;
                  lastDownloadedBytes = downloadedBytes;
                }
                this.push(Buffer.from(value));
              }
            } catch (err) {
              this.destroy(err);
            }
          }
        });

        await new Promise((resolve, reject) => {
          readableNodeStream.pipe(fileStream);
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
          readableNodeStream.on('error', reject);
        });

        if (isValidWindowsExe(partPath)) {
          if (fs.existsSync(destPath)) {
            try { fs.unlinkSync(destPath); } catch {}
          }
          fs.renameSync(partPath, destPath);
          downloadState.status = 'ready';
          downloadState.installerPath = destPath;
          downloadState.progress.percent = 100;
          downloadState.error = null;
          console.log('[*] Background update download complete:', destPath);
        } else {
          try { if (fs.existsSync(partPath)) fs.unlinkSync(partPath); } catch {}
          downloadState.status = 'error';
          downloadState.error = 'Installer failed PE validation';
        }
      } catch (err) {
        console.warn('[!] Background download error:', err.message);
        try { if (fs.existsSync(partPath)) fs.unlinkSync(partPath); } catch {}
        downloadState.status = 'error';
        downloadState.error = err.message;
      }
    })();

    return NextResponse.json({ success: true, ...downloadState });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
