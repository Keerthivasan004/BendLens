import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import serverCache from '@/lib/serverCache';
import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name || 'project.zip';

    // Temporary upload target in os.tmpdir()
    const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extractDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(extractDir, { recursive: true });

    if (fileName.endsWith('.zip')) {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(extractDir, true);
    } else {
      // Single file upload (.sql, .prisma, .py, etc.)
      const targetFilePath = path.join(extractDir, fileName);
      fs.writeFileSync(targetFilePath, buffer);
    }

    // If zip extracted into a single root folder, analyze inner folder
    const extractedItems = fs.readdirSync(extractDir);
    let targetAnalyzeDir = extractDir;
    if (extractedItems.length === 1 && fs.statSync(path.join(extractDir, extractedItems[0])).isDirectory()) {
      targetAnalyzeDir = path.join(extractDir, extractedItems[0]);
    }

    // Analyze extracted project
    const result = ProjectAnalyzer.analyze(targetAnalyzeDir);
    result.projectName = fileName.replace(/\.zip$/i, '');
    
    serverCache.setLatest(result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Upload Scan Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process uploaded file' },
      { status: 500 }
    );
  }
}
