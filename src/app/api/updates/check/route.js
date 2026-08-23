import { NextResponse } from 'next/server';
import packageJson from '@/../package.json';

export const dynamic = 'force-dynamic';

const CURRENT_VERSION = packageJson.version || '1.0.0';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceCheck = searchParams.get('force') === 'true';

    let latestVersion = CURRENT_VERSION;
    let hasUpdate = false;
    let releaseNotes = [
      'Multi-dialect SQL, SQLite, and MongoDB Schema Visualizer',
      'High-Level (HLD) & Low-Level (LLD) Design Flowcharts',
      'Deterministic Blast Radius Simulator with Impact Calculations',
      'Local Desktop Execution with Auto-Refreshing Brand Icons'
    ];

    // Non-blocking quick check
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      
      const remoteRes = await fetch(
        'https://raw.githubusercontent.com/Keerthivasan004/BendLens/main/package.json',
        { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        }
      );
      clearTimeout(timeoutId);

      if (remoteRes.ok) {
        const data = await remoteRes.json();
        if (data.version) {
          latestVersion = data.version;
          hasUpdate = isNewerVersion(latestVersion, CURRENT_VERSION);
        }
      }
    } catch (e) {
      // Graceful offline fallback
    }

    return NextResponse.json({
      success: true,
      currentVersion: CURRENT_VERSION,
      latestVersion,
      hasUpdate,
      releaseNotes,
      releaseDate: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
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
