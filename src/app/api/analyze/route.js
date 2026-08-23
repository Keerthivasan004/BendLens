import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import serverCache from '@/lib/serverCache';
import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), '.bendlens_history.json');

function saveToHistory(result) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) || [];
    }
    history = history.filter(h => h.projectPath !== result.projectPath && h.projectName !== result.projectName);
    history.unshift({
      id: `proj_${Date.now()}`,
      projectName: result.projectName,
      projectPath: result.projectPath,
      timestamp: result.timestamp,
      filesCount: result.scannedFilesCount || 0,
      tablesCount: result.schema?.tables?.length || 0,
      endpointsCount: result.code?.endpoints?.length || 0
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 15), null, 2), 'utf-8');
  } catch {}
}

export async function POST(request) {
  try {
    const body = await request.json();
    let targetPath = (body.path || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!targetPath) {
      targetPath = path.join(process.cwd(), 'sample_project');
    }

    const result = ProjectAnalyzer.analyze(targetPath);
    
    serverCache.setLatest(result);
    saveToHistory(result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze project' },
      { status: 500 }
    );
  }
}
