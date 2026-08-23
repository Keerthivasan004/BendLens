import { NextResponse } from 'next/server';
import packageJson from '@/../package.json';

export const dynamic = 'force-dynamic';

const CURRENT_VERSION = packageJson.version || '1.0.0';

export async function GET() {
  try {
    let latestVersion = CURRENT_VERSION;
    let releaseNotes = [
      'Universal AST database schema extraction & multi-dialect SQL support',
      'Interactive C4 architecture models (HLD, LLD, and Business Journeys)',
      'Deterministic Blast Radius Simulator with ripple effect calculations',
      'Air-gapped 100% private local desktop execution with auto-updates'
    ];
    let releaseDate = new Date().toISOString();

    // Check remote repository for latest version
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const remotePkgRes = await fetch(
        'https://raw.githubusercontent.com/Keerthivasan004/BendLens/main/package.json',
        { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        }
      );
      clearTimeout(timeoutId);

      if (remotePkgRes.ok) {
        const remotePkg = await remotePkgRes.json();
        if (remotePkg.version) {
          latestVersion = remotePkg.version;
        }
      }
    } catch (fetchErr) {
      // Offline or private repo without token - use local manifest
    }

    const hasUpdate = isNewerVersion(latestVersion, CURRENT_VERSION);

    return NextResponse.json({
      success: true,
      currentVersion: CURRENT_VERSION,
      latestVersion,
      hasUpdate,
      releaseNotes,
      releaseDate
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION,
      hasUpdate: false
    });
  }
}

function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}
