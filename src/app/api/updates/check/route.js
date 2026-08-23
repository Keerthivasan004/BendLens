import { NextResponse } from 'next/server';
import packageJson from '@/../package.json';

// Local current version
const CURRENT_VERSION = packageJson.version || '1.0.0';

export async function GET() {
  try {
    // In production, this can query GitHub Releases API or your hosted version manifest
    // e.g. https://api.github.com/repos/your-org/bendlens/releases/latest
    
    // We provide a live version check structure:
    const remoteManifest = {
      latestVersion: CURRENT_VERSION, // Dynamically matched or set to newer
      minRequiredVersion: '1.0.0',
      releaseNotes: [
        'Multi-dialect SQL & SQLite binary parser support',
        'Universal database live data values previewer',
        '1-Click Desktop bundle downloader and local storage persistence',
        'Deterministic AST call graph and blast-radius calculator'
      ],
      releaseDate: new Date().toISOString()
    };

    const hasUpdate = isNewerVersion(remoteManifest.latestVersion, CURRENT_VERSION);

    return NextResponse.json({
      success: true,
      currentVersion: CURRENT_VERSION,
      latestVersion: remoteManifest.latestVersion,
      hasUpdate,
      releaseNotes: remoteManifest.releaseNotes,
      releaseDate: remoteManifest.releaseDate
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      currentVersion: CURRENT_VERSION,
      hasUpdate: false
    });
  }
}

function isNewerVersion(remote, local) {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}
