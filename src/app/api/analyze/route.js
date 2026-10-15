import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import { getSampleProjectPath } from '@/lib/appPaths';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HISTORY_FILE = path.join(os.tmpdir(), '.bendlens_history.json');

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
      targetPath = getSampleProjectPath();
    }

    const isUrl = targetPath.startsWith('http://') || targetPath.startsWith('https://') || /^(?:api\.|github\.com|gitlab\.com|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/|$))/i.test(targetPath);
    if (isUrl) {
      if (!targetPath.startsWith('http://') && !targetPath.startsWith('https://')) {
        targetPath = 'https://' + targetPath;
      }
      const UniversalApiCrawler = require('@/lib/universalApiCrawler');
      const crawlResult = await UniversalApiCrawler.crawl(targetPath, { maxChunks: 500, concurrency: 24 });
      if (crawlResult?.telemetry?.crawlStatus === 'failed') {
        return NextResponse.json(
          { success: false, error: crawlResult.telemetry.error || `Unable to access or crawl ${targetPath}. Please verify the target URL and network connection.` },
          { status: 400 }
        );
      }

      const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const scanId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cloneDir = path.join(uploadsDir, scanId);
      fs.mkdirSync(cloneDir, { recursive: true });

      if (crawlResult.openApiSpec) {
        fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec, null, 2), 'utf-8');
      }
      if (crawlResult.sqlSchema) {
        fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
      }

      const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
      result.projectName = crawlResult.projectName;
      result.projectPath = targetPath;
      result.crawlerTelemetry = crawlResult.telemetry;
      result.isUrlCrawl = true;
      if (!crawlResult.sqlSchema) {
        result.schema = { tables: [], relationships: [] };
      }
      saveToHistory(result);

      return NextResponse.json(
        { success: true, data: result },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Always run fresh analysis asynchronously with cooperative event-loop yields
    const result = await ProjectAnalyzer.analyzeAsync(targetPath);
    saveToHistory(result);

    return NextResponse.json(
      { success: true, data: result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze project' },
      { status: 500 }
    );
  }
}
