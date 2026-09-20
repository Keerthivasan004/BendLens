import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import { getSampleProjectPath } from '@/lib/appPaths';

// Never serve a cached analysis — every rescan must hit the disk fresh,
// otherwise a changed folder keeps showing the same old table/API counts.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryPath = searchParams.get('path');

    if (!queryPath) {
      // No path provided - return 404 to force explicit scan
      // This prevents accidental exposure of other users' data
      return NextResponse.json(
        { success: false, error: 'No project path provided. Use /api/analyze to scan a project first.' },
        { status: 404 }
      );
    }

    const cleanPath = queryPath.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    
    // Always run fresh analysis for the requested path - no caching
    const data = await ProjectAnalyzer.analyzeAsync(cleanPath);

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Current Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve analysis' },
      { status: 500 }
    );
  }
}
