import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import UniversalApiCrawler from '@/lib/universalApiCrawler';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
      id: `crawl_${Date.now()}`,
      projectName: result.projectName,
      projectPath: result.projectPath,
      timestamp: result.timestamp || new Date().toISOString(),
      filesCount: result.scannedFilesCount || 0,
      tablesCount: result.schema?.tables?.length || 0,
      endpointsCount: result.endpoints?.length || result.code?.endpoints?.length || 0,
      source: 'web_crawler'
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 15), null, 2), 'utf-8');
  } catch { }
}

export async function POST(request) {
  let cloneDir = null;
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
    cloneDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(cloneDir, { recursive: true });

    const maxChunks = (typeof body.maxChunks === 'number' && body.maxChunks > 0) ? body.maxChunks : Infinity;
    const concurrency = (typeof body.concurrency === 'number' && body.concurrency > 0) ? body.concurrency : 32;
    const customHeaders = body.headers || body.customHeaders || {};
    const crawlDepth = body.crawlDepth || 'deep';
    const preloadedHtml = body.preloadedHtml || body.html || null;

    // Execute Enterprise Universal Crawler
    const crawlResult = await UniversalApiCrawler.crawl(targetUrl, { maxChunks, concurrency, customHeaders, crawlDepth, preloadedHtml });

    if (crawlResult?.telemetry?.crawlStatus === 'failed') {
      const hasSubdomains = (crawlResult.telemetry?.subdomains?.length || crawlResult.subdomains?.length || 0) > 0;
      const hasEndpoints = (Object.keys(crawlResult.openApiSpec?.paths || {}).length > 0);
      if (hasSubdomains || hasEndpoints) {
        crawlResult.telemetry.crawlStatus = 'success';
        crawlResult.telemetry.notice = crawlResult.telemetry.notice || crawlResult.telemetry.error || 'Perimeter discovered successfully.';
      } else {
        return NextResponse.json(
          { success: false, error: crawlResult.telemetry.error || `Unable to access or crawl ${targetUrl}. Please verify the URL and network connection.` },
          { status: 400 }
        );
      }
    }

    // Materialize OpenAPI and Relational Schemas for AST Analysis (compact to avoid multi-megabyte formatting bloat)
    if (crawlResult.openApiSpec) {
      fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec), 'utf-8');
    }
    if (crawlResult.sqlSchema) {
      fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
    }

    // Run AST Analysis, Diagram Generation & Blast Radius Engine
    const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
    result.projectName = crawlResult.projectName;
    result.projectPath = targetUrl;
    result.targetUrl = targetUrl;
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
    if ((!result.endpoints || result.endpoints.length === 0) && crawlResult.openApiSpec?.paths) {
      const derived = [];
      for (const [rPath, methodsObj] of Object.entries(crawlResult.openApiSpec.paths)) {
        if (!methodsObj || typeof methodsObj !== 'object') continue;
        for (const [m, op] of Object.entries(methodsObj)) {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(m.toLowerCase())) {
            let sub = op?.['x-subdomain'] || null;
            if (!sub && rPath.startsWith('//')) {
              sub = rPath.slice(2).split('/')[0];
            }
            derived.push({
              method: m.toUpperCase(),
              path: rPath.startsWith('//') ? '/' + rPath.slice(2).split('/').slice(1).join('/') : rPath,
              summary: op?.summary || op?.description || '',
              source: sub ? `Subdomain (${sub})` : 'Universal Web Crawler',
              module: op?.['x-bundle-source'] || '',
              subdomain: sub,
              origin: op?.['x-origin'] || (sub ? `https://${sub}` : null),
              crawlTier: op?.['x-crawl-tier'] || 'normal',
              isLazyLoaded: op?.['x-lazy-loaded'] === true,
              routeType: op?.['x-route-type'] || 'API',
              isUiRoute: op?.['x-is-ui-route'] === true
            });
          }
        }
      }
      result.endpoints = derived;
      if (!result.code) result.code = { endpoints: [], stats: { totalEndpoints: 0 } };
      result.code.endpoints = derived;
      if (result.code.stats) result.code.stats.totalEndpoints = derived.length;
    }
    if (result.openApiSpec?.paths && Object.keys(result.openApiSpec.paths).length > 500) {
      const compactedPaths = {};
      for (const [p, methodsObj] of Object.entries(result.openApiSpec.paths)) {
        if (!methodsObj || typeof methodsObj !== 'object') continue;
        compactedPaths[p] = {};
        for (const [m, op] of Object.entries(methodsObj)) {
          if (typeof op === 'object' && op !== null) {
            compactedPaths[p][m] = {
              summary: op.summary || op.description || '',
              'x-subdomain': op['x-subdomain'] || null,
              'x-discovery-scope': op['x-discovery-scope'] || undefined
            };
          } else {
            compactedPaths[p][m] = op;
          }
        }
      }
      result.openApiSpec = {
        ...result.openApiSpec,
        paths: compactedPaths
      };
    }

    // Avoid duplicating multi-megabyte endpoints arrays across telemetry and personas
    if (result.crawlerTelemetry) {
      delete result.crawlerTelemetry.endpoints;
    }
    if (crawlResult.telemetry) {
      delete crawlResult.telemetry.endpoints;
    }
    if (result.code?.endpoints) {
      result.endpoints = result.code.endpoints;
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

    return NextResponse.json(safeResponseJson({
      success: true,
      data: result,
      telemetry: crawlResult.telemetry,
      techStack: result.techStack,
      cloudProvider: result.cloudProvider,
      legalDocuments: result.legalDocuments
    }));
  } catch (error) {
    console.error('Universal Crawler Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Crawl failed' },
      { status: 500 }
    );
  } finally {
    if (cloneDir) {
      try {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      } catch { }
    }
  }
}
