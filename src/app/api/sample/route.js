import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import { getSampleProjectPath } from '@/lib/appPaths';

export async function GET() {
  try {
    const samplePath = getSampleProjectPath();
    const result = ProjectAnalyzer.analyze(samplePath);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Sample Project Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze sample project' },
      { status: 500 }
    );
  }
}
