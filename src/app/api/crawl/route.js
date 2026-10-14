import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import UniversalApiCrawler from '@/lib/universalApiCrawler';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const HISTORY_FILE = path.join(os.tmpdir(), '.bendlens_history.json');

function saveToHistory(result) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) || [];
    }
    history = history.filter(h => h.projectPath !== result.projectPath && h.projectName !== result.projectName);
    history.unshift({
      id: `crawl_${Date.now()}`,
      projectName: result.projectName,
      projectPath: result.projectPath,
      timestamp: result.timestamp,
      filesCount: result.scannedFilesCount || 0,
      tablesCount: result.schema?.tables?.length || 0,
      endpointsCount: result.code?.endpoints?.length || 0,
      source: 'web_crawler'
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 15), null, 2), 'utf-8');
  } catch {}
}

export async function POST(request) {
  try {
    const body = await request.json();
    let targetUrl = (body.url || body.repoUrl || body.targetUrl || '').trim();

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid URL to crawl.' },
        { status: 400 }
      );
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const scanId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cloneDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(cloneDir, { recursive: true });

    const maxChunks = body.maxChunks || 500;
    const concurrency = body.concurrency || 24;

    // Execute Enterprise Universal Crawler
    const crawlResult = await UniversalApiCrawler.crawl(targetUrl, { maxChunks, concurrency });

    if (crawlResult?.telemetry?.crawlStatus === 'failed') {
      return NextResponse.json(
        { success: false, error: crawlResult.telemetry.error || `Unable to access or crawl ${targetUrl}. Please verify the URL and network connection.` },
        { status: 400 }
      );
    }

    // Materialize OpenAPI and Relational Schemas for AST Analysis
    if (crawlResult.openApiSpec) {
      fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec, null, 2), 'utf-8');
    }
    if (crawlResult.sqlSchema) {
      fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
    }

    // Run AST Analysis, Diagram Generation & Blast Radius Engine
    const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
    result.projectName = crawlResult.projectName;
    result.crawlerTelemetry = crawlResult.telemetry;

    saveToHistory(result);

    return NextResponse.json({
      success: true,
      data: result,
      telemetry: crawlResult.telemetry
    });
  } catch (error) {
    console.error('Universal Crawler Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Crawl failed' },
      { status: 500 }
    );
  }
}
