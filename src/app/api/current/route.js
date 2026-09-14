import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import serverCache from '@/lib/serverCache';
import { getSampleProjectPath } from '@/lib/appPaths';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryPath = searchParams.get('path');

    let data = null;

    if (queryPath) {
      const cleanPath = queryPath.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
      data = serverCache.getByPath(cleanPath);
      if (!data) {
        data = ProjectAnalyzer.analyze(cleanPath);
        serverCache.setLatest(data);
      }
    } else {
      data = serverCache.getLatest();
      if (!data) {
        const samplePath = getSampleProjectPath();
        data = ProjectAnalyzer.analyze(samplePath);
        serverCache.setLatest(data);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Current Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve analysis' },
      { status: 500 }
    );
  }
}
