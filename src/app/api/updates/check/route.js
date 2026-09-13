import { NextResponse } from 'next/server';
import {
  getLocalVersion,
  setLocalVersion,
  getLatestRelease,
  getEffectiveLatest,
  isNewerVersion
} from '@/lib/releaseInfo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const simulateUpdate = searchParams.get('simulate') === 'true';
    // Desktop-only remote discovery: the packaged app has no dist/ folder,
    // so without this a downloaded install could never learn of a release.
    // Plain (web/probe) callers stay purely local: fast and offline-safe.
    const allowRemote = searchParams.get('source') === 'desktop';

    const currentVersion = getLocalVersion();
    const { latestVersion, updateArtifact, updateSource } = await getEffectiveLatest(
      undefined,
      { allowRemote }
    );

    // Strict semantic version comparison: only true if latestVersion is strictly newer than currentVersion
    let hasUpdate = isNewerVersion(latestVersion, currentVersion);

    if (simulateUpdate) {
      hasUpdate = true;
    }

    const featureShowcase = [
      {
        id: 'db-parser',
        title: 'Universal Polyglot DB Parser & Spreadsheet Inspector',
        tag: 'Schema Ingestion',
        badge: 'New in v1.1.0',
        summary: 'Instant deterministic extraction across PostgreSQL, MySQL, SQLite, MongoDB, and Prisma with live spreadsheet row values inspection.',
        highlights: [
          'Full DDL AST parsing for relational, document, and ORM schemas',
          'Zero-truncation interactive spreadsheet data values grid',
          'Automated primary, foreign key, and index constraint mapping'
        ],
        stats: '6 Databases · Zero Latency'
      },
      {
        id: 'blast-radius',
        title: 'Deterministic Blast Radius & Ripple Simulator',
        tag: 'Risk Governance',
        badge: 'Core Engine',
        summary: 'Simulate structural schema mutations and trace cascading shockwaves across foreign key relations and downstream API contracts.',
        highlights: [
          'Real-time calculated blast impact percentage and risk scores',
          'Cascading relation shockwave propagation mapping',
          'Auto-generated developer breaking change mitigation checklists'
        ],
        stats: 'Multi-Hop Traversal · Real-Time Risk'
      },
      {
        id: 'c4-diagrams',
        title: 'Multi-Tier C4 HLD & LLD Architecture Flowcharts',
        tag: 'Visual Canvas',
        badge: 'Interactive Flow',
        summary: 'Pan and zoom through high-level container topologies and low-level AST symbol call graphs with vector SVG precision.',
        highlights: [
          'Dynamic switching across ERD, HLD, LLD, and Sequence diagrams',
          'Live animated request packets traversing service boundaries',
          'Instant 1-click Markdown and PDF architectural report exports'
        ],
        stats: 'Mermaid.js Engine · Infinite Canvas'
      },
      {
        id: 'desktop-studio',
        title: 'Air-Gapped Desktop Studio & Local Privacy Engine',
        tag: 'Privacy & Security',
        badge: '100% Offline',
        summary: 'Native Windows desktop packaging with zero cloud telemetry, instant launch, and automated official brand asset synchronization.',
        highlights: [
          '100% in-memory processing with zero external data leakage',
          'Automatic desktop shortcut and official brand icon sync',
          'Ultra-fast native launcher with background daemon management'
        ],
        stats: 'Air-Gapped · Localhost Only'
      }
    ];

    return NextResponse.json({
      success: true,
      currentVersion,
      latestVersion,
      hasUpdate,
      updateArtifact,
      updateSource,
      releaseNotes: featureShowcase.map(f => f.title),
      featureShowcase,
      releaseDate: new Date().toISOString()
    });
  } catch (error) {
    const currentVersion = getLocalVersion();
    const { latestVersion, updateArtifact } = getLatestRelease();
    return NextResponse.json({
      success: true,
      currentVersion,
      latestVersion,
      hasUpdate: isNewerVersion(latestVersion, currentVersion),
      updateArtifact,
      updateSource: 'local'
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { latestVersion } = getLatestRelease();
    if (body.action === 'reset') {
      setLocalVersion('1.0.0');
      return NextResponse.json({
        success: true,
        action: 'reset',
        currentVersion: '1.0.0',
        latestVersion,
        hasUpdate: true,
        updateArtifact: getLatestRelease().updateArtifact
      });
    }
    if (body.action === 'bump') {
      setLocalVersion(latestVersion);
      return NextResponse.json({
        success: true,
        action: 'bump',
        currentVersion: latestVersion,
        latestVersion,
        hasUpdate: false,
        updateArtifact: null
      });
    }
    return NextResponse.json({
      success: true,
      currentVersion: getLocalVersion(),
      latestVersion,
      hasUpdate: isNewerVersion(latestVersion, getLocalVersion()),
      updateArtifact: getLatestRelease().updateArtifact
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
