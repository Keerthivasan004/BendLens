import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import { getSampleProjectPath } from '@/lib/appPaths';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const revalidate = 0;

const HISTORY_FILE = path.join(os.tmpdir(), '.bendlens_history.json');

function safeResponseJson(data) {
  const ancestors = [];
  try {
    return JSON.parse(JSON.stringify(data, function (key, value) {
      if (typeof value === 'object' && value !== null) {
        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
          ancestors.pop();
        }
        if (ancestors.includes(value)) {
          return undefined;
        }
        ancestors.push(value);
      }
      return value;
    }));
  } catch {
    return data;
  }
}

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
      timestamp: result.timestamp || new Date().toISOString(),
      filesCount: result.scannedFilesCount || 0,
      tablesCount: result.schema?.tables?.length || 0,
      endpointsCount: result.endpoints?.length || result.code?.endpoints?.length || 0
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
      const crawlDepth = body.crawlDepth || 'deep';
      const preloadedHtml = body.preloadedHtml || body.html || null;
      const maxChunks = (typeof body.maxChunks === 'number' && body.maxChunks > 0) ? body.maxChunks : Infinity;
      const concurrency = (typeof body.concurrency === 'number' && body.concurrency > 0) ? body.concurrency : 32;
      const crawlResult = await UniversalApiCrawler.crawl(targetPath, { maxChunks, concurrency, crawlDepth, preloadedHtml });
      if (crawlResult?.telemetry?.crawlStatus === 'failed') {
        const hasSubdomains = (crawlResult.telemetry?.subdomains?.length || crawlResult.subdomains?.length || 0) > 0;
        const hasEndpoints = (Object.keys(crawlResult.openApiSpec?.paths || {}).length > 0);
        if (hasSubdomains || hasEndpoints) {
          crawlResult.telemetry.crawlStatus = 'success';
          crawlResult.telemetry.notice = crawlResult.telemetry.notice || crawlResult.telemetry.error || 'Perimeter discovered successfully.';
        } else {
          return NextResponse.json(
            { success: false, error: crawlResult.telemetry.error || `Unable to access or crawl ${targetPath}. Please verify the target URL and network connection.` },
            { status: 400 }
          );
        }
      }

      const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const scanId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cloneDir = path.join(uploadsDir, scanId);
      fs.mkdirSync(cloneDir, { recursive: true });

      try {
        if (crawlResult.openApiSpec) {
          fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec, null, 2), 'utf-8');
        }
        if (crawlResult.sqlSchema) {
          fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
        }

        const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
        result.projectName = crawlResult.projectName;
        result.projectPath = targetPath;
        result.targetUrl = targetPath;
        result.openApiSpec = crawlResult.openApiSpec;
        result.crawlerTelemetry = crawlResult.telemetry;
        result.subdomains = crawlResult.telemetry?.subdomains || crawlResult.subdomains || result.subdomains || [];
        result.liveSubdomains = crawlResult.telemetry?.liveSubdomains || crawlResult.liveSubdomains || [];
        result.historicalSubdomains = crawlResult.telemetry?.historicalSubdomains || crawlResult.historicalSubdomains || [];
        result.subdomainStatusMap = crawlResult.telemetry?.subdomainStatusMap || crawlResult.subdomainStatusMap || {};
        result.subdomainCounts = crawlResult.telemetry?.subdomainCounts || {
          total: result.subdomains.length,
          live: result.liveSubdomains.length,
          historical: result.historicalSubdomains.length
        };
        result.techStack = crawlResult.techStack || crawlResult.telemetry?.techStack;
        result.cloudProvider = crawlResult.cloudProvider || crawlResult.techStack?.cloudProvider || crawlResult.telemetry?.cloudProvider;
        result.isUrlCrawl = true;
        result.legalDocuments = crawlResult.legalDocuments || crawlResult.telemetry?.legalDocuments || null;
        result.timestamp = result.timestamp || new Date().toISOString();
        result.scannedFilesCount = crawlResult.telemetry?.chunksCrawledCount || result.scannedFilesCount || 1;
        if (!result.endpoints || result.endpoints.length === 0) {
          result.endpoints = result.code?.endpoints || [];
        }
        if (!crawlResult.sqlSchema) {
          result.schema = { tables: [], relationships: [] };
        }
        if (result.personas?.developer) {
          result.personas.developer.techStack = result.techStack;
          result.personas.developer.cloudProvider = result.cloudProvider;
          result.personas.developer.legalDocuments = result.legalDocuments;
          result.personas.developer.crawlerTelemetry = result.crawlerTelemetry;
        }
        if (result.personas?.manager) {
          result.personas.manager.techStack = result.techStack;
          result.personas.manager.cloudProvider = result.cloudProvider;
          result.personas.manager.legalDocuments = result.legalDocuments;
        }
        if (result.personas?.business) {
          result.personas.business.techStack = result.techStack;
          result.personas.business.cloudProvider = result.cloudProvider;
          result.personas.business.legalDocuments = result.legalDocuments;
        }
        saveToHistory(result);

        return NextResponse.json(
          safeResponseJson({
            success: true,
            data: result,
            telemetry: crawlResult.telemetry,
            techStack: result.techStack,
            cloudProvider: result.cloudProvider,
            legalDocuments: result.legalDocuments
          }),
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      } finally {
        try {
          fs.rmSync(cloneDir, { recursive: true, force: true });
        } catch {}
      }
    }

    // Always run fresh analysis asynchronously with cooperative event-loop yields
    const result = await ProjectAnalyzer.analyzeAsync(targetPath);
    saveToHistory(result);

    return NextResponse.json(
      safeResponseJson({ success: true, data: result }),
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
