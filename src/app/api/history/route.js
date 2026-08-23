import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const dynamic = 'force-dynamic';

const HISTORY_FILE = path.join(os.tmpdir(), '.bendlens_history.json');

function readLocalHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(raw) || [];
    }
  } catch (err) {
    console.error('Error reading history file:', err.message);
  }
  return [];
}

function writeLocalHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing history file:', err.message);
  }
}

export async function GET() {
  const history = readLocalHistory();
  return NextResponse.json({ success: true, data: history });
}

export async function POST(request) {
  try {
    const item = await request.json();
    const history = readLocalHistory();

    // Deduplicate by path or project name
    const filtered = history.filter(h => h.projectPath !== item.projectPath && h.projectName !== item.projectName);
    const updated = [
      {
        id: item.id || `proj_${Date.now()}`,
        projectName: item.projectName,
        projectPath: item.projectPath,
        timestamp: new Date().toISOString(),
        filesCount: item.scannedFilesCount || 0,
        tablesCount: item.schema?.tables?.length || 0,
        endpointsCount: item.code?.endpoints?.length || 0
      },
      ...filtered
    ];

    writeLocalHistory(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
