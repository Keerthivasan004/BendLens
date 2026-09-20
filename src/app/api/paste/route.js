import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, fileType = 'schema.sql', projectName = 'Pasted Schema' } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, error: 'No code or schema provided' }, { status: 400 });
    }

    const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const scanId = `paste_${Date.now()}`;
    const extractDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(extractDir, { recursive: true });

    const targetFilePath = path.join(extractDir, fileType);
    fs.writeFileSync(targetFilePath, code, 'utf-8');

    // Run analyzer - always fresh, no caching
    const result = await ProjectAnalyzer.analyzeAsync(extractDir);
    result.projectName = projectName;

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Paste Code Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze pasted code' },
      { status: 500 }
    );
  }
}
