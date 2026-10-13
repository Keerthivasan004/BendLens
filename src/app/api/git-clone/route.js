import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import ApiSpecSynthesizer from '@/lib/apiSpecSynthesizer';
import UniversalApiCrawler from '@/lib/universalApiCrawler';
import { getAdmZip } from '@/lib/safeAdmZip';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    let repoUrl = (body.repoUrl || '').trim();
    let token = (body.token || '').trim(); // GitHub Personal Access Token

    if (!repoUrl) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid URL (Git repo, OpenAPI/Swagger spec, or REST API endpoint).' },
        { status: 400 }
      );
    }

    // Auto-normalize URLs missing protocol scheme
    if (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
      repoUrl = 'https://' + repoUrl;
    }

    // Always use os.tmpdir() for serverless / Vercel compatibility
    const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const scanId = `git_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cloneDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(cloneDir, { recursive: true });

    let lastError = '';

    // =========================================================================
    // STEP 1: Direct File / Blob URL Normalization
    // Convert GitHub/GitLab web blob view URLs directly into raw file URLs
    // =========================================================================
    let targetFetchUrl = repoUrl;
    const ghBlobMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/i);
    if (ghBlobMatch) {
      const [, owner, repo, branch, filePath] = ghBlobMatch;
      targetFetchUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    }
    const glBlobMatch = repoUrl.match(/gitlab\.com\/([^\/]+)\/([^\/]+)\/-\/blob\/([^\/]+)\/(.+)/i);
    if (glBlobMatch) {
      const [, owner, repo, branch, filePath] = glBlobMatch;
      targetFetchUrl = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${filePath}`;
    }

    // =========================================================================
    // STEP 2: Intelligent HTTP Fetch & AST Ingestion
    // Handles:
    //  - Live REST API endpoints returning JSON data (e.g. JSONPlaceholder, DummyJSON)
    //  - Direct OpenAPI / Swagger JSON or YAML specification URLs
    //  - Swagger UI / Redoc / API documentation HTML pages with auto-discovery
    //  - Postman Collections (JSON)
    //  - Raw Schema files (.sql, .prisma, etc.)
    // =========================================================================
    if (targetFetchUrl.startsWith('http://') || targetFetchUrl.startsWith('https://')) {
      // Exclude generic github repository root paths from immediate single-file fetch
      const isGithubRepoRoot = /^https?:\/\/(?:www\.)?github\.com\/[^\/]+\/[^\/\?#]+\/?$/i.test(targetFetchUrl) &&
        !/\.(?:json|yaml|yml|sql|prisma)$/i.test(targetFetchUrl);

      if (!isGithubRepoRoot) {
        try {
          const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BendLens/1.0',
            'Accept': 'application/json, application/yaml, text/yaml, text/plain, text/html, */*'
          };
          if (token) {
            fetchHeaders['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_') || token.startsWith('Bearer ')
              ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`)
              : `token ${token}`;
          }

          let specRes = await fetch(targetFetchUrl, {
            headers: fetchHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(15000)
          });

          if (specRes.ok) {
            let contentType = (specRes.headers.get('content-type') || '').toLowerCase();
            let text = await specRes.text();

            // -----------------------------------------------------------------
            // CASE 2A: Swagger UI / Documentation HTML Page Auto-Discovery
            // -----------------------------------------------------------------
            if (contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              const discoveredUrls = ApiSpecSynthesizer.discoverSpecUrlsFromHtml(text, targetFetchUrl);
              for (const candUrl of discoveredUrls) {
                try {
                  const candRes = await fetch(candUrl, {
                    headers: fetchHeaders,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(6000)
                  });
                  if (candRes.ok) {
                    const candText = await candRes.text();
                    if (candUrl.includes('swagger-initializer.js')) {
                      const initUrlMatch = candText.match(/(?:url|defaultDefinitionUrl)\s*[:=]\s*["']([^"']+\.(?:json|yaml|yml))["']/i);
                      if (initUrlMatch) {
                        const resolvedUrl = new URL(initUrlMatch[1], candUrl).href;
                        const finalRes = await fetch(resolvedUrl, { headers: fetchHeaders, signal: AbortSignal.timeout(6000) });
                        if (finalRes.ok) {
                          text = await finalRes.text();
                          contentType = 'application/json';
                          break;
                        }
                      }
                    } else if (candText.includes('"swagger"') || candText.includes('"openapi"') || candText.includes('swagger:') || candText.includes('openapi:') || candText.includes('paths:')) {
                      text = candText;
                      contentType = candUrl.endsWith('.yaml') || candUrl.endsWith('.yml') ? 'text/yaml' : 'application/json';
                      break;
                    }
                  }
                } catch {}
              }

              // -----------------------------------------------------------------
              // CASE 2A-ii: Universal Barrier-Free Crawler (SPAs / Multi-Chunk / Vite / React / Next.js)
              // (e.g. websites like https://futrsec.in, https://fts2trial.bcbuzz.tech)
              // -----------------------------------------------------------------
              const hasMarkersNow = text.includes('"swagger"') || text.includes('"openapi"') || 
                                    text.includes('swagger:') || text.includes('openapi:') || 
                                    text.includes('paths:') || text.includes('"paths"');

              if (!hasMarkersNow) {
                try {
                  const crawlResult = await UniversalApiCrawler.crawl(targetFetchUrl, { maxChunks: 500, concurrency: 24 });
                  if (crawlResult && crawlResult.openApiSpec) {
                    fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec, null, 2), 'utf-8');
                    if (crawlResult.sqlSchema) {
                      fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
                    }
                    const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
                    result.projectName = crawlResult.projectName;
                    result.crawlerTelemetry = crawlResult.telemetry;
                    return NextResponse.json({ success: true, data: result });
                  }
                } catch (crawlErr) {
                  console.warn('Universal web crawler error:', crawlErr.message);
                }
              }
            }

            // -----------------------------------------------------------------
            // CASE 2B: OpenAPI / Swagger Specification (JSON or YAML)
            // -----------------------------------------------------------------
            const hasApiMarkers = text.includes('"swagger"') || text.includes('"openapi"') || 
                                  text.includes('swagger:') || text.includes('openapi:') || 
                                  text.includes('paths:') || text.includes('"paths"');

            if (hasApiMarkers) {
              const isYaml = !text.trim().startsWith('{');
              const targetFileName = isYaml ? 'openapi.yaml' : 'openapi.json';
              fs.writeFileSync(path.join(cloneDir, targetFileName), text, 'utf-8');

              let projectName = 'API Specification';
              try {
                if (!isYaml) {
                  const parsed = JSON.parse(text);
                  if (parsed.info && parsed.info.title) projectName = parsed.info.title;

                  // Synthesize companion SQL schema from OpenAPI definitions/schemas
                  const companionSql = ApiSpecSynthesizer.synthesizeSqlFromOpenApi(parsed);
                  if (companionSql) {
                    fs.writeFileSync(path.join(cloneDir, 'schema.sql'), companionSql, 'utf-8');
                  }
                } else {
                  const titleMatch = text.match(/title\s*:\s*['"]?([^'"\n]+)['"]?/i);
                  if (titleMatch) projectName = titleMatch[1].trim();
                }
              } catch {}

              const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
              result.projectName = projectName;
              return NextResponse.json({ success: true, data: result });
            }

            // -----------------------------------------------------------------
            // CASE 2C: Postman Collection JSON
            // -----------------------------------------------------------------
            if (text.trim().startsWith('{')) {
              try {
                const parsedJson = JSON.parse(text);
                if (parsedJson.info && Array.isArray(parsedJson.item)) {
                  const syn = ApiSpecSynthesizer.synthesizeFromPostman(parsedJson);
                  fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(syn.openApiSpec, null, 2), 'utf-8');
                  if (syn.sqlSchema) {
                    fs.writeFileSync(path.join(cloneDir, 'schema.sql'), syn.sqlSchema, 'utf-8');
                  }
                  const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
                  result.projectName = syn.projectName;
                  return NextResponse.json({ success: true, data: result });
                }
              } catch {}
            }

            // -----------------------------------------------------------------
            // CASE 2D: Live REST API Endpoint Returning JSON Data
            // (e.g. JSONPlaceholder, DummyJSON, GitHub API, custom REST API endpoints)
            // -----------------------------------------------------------------
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              try {
                const parsedJson = JSON.parse(text);
                if (Array.isArray(parsedJson) || (typeof parsedJson === 'object' && parsedJson !== null && Object.keys(parsedJson).length > 0)) {
                  const syn = ApiSpecSynthesizer.synthesizeFromApiResponse(repoUrl, parsedJson);
                  fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(syn.openApiSpec, null, 2), 'utf-8');
                  if (syn.sqlSchema) {
                    fs.writeFileSync(path.join(cloneDir, 'schema.sql'), syn.sqlSchema, 'utf-8');
                  }
                  const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
                  result.projectName = syn.projectName;
                  return NextResponse.json({ success: true, data: result });
                }
              } catch {}
            }

            // -----------------------------------------------------------------
            // CASE 2E: Direct Schema File (SQL, Prisma, GraphQL)
            // -----------------------------------------------------------------
            if (text.includes('CREATE TABLE') || text.includes('model ') || text.includes('type Query') || targetFetchUrl.endsWith('.sql') || targetFetchUrl.endsWith('.prisma')) {
              const fileName = targetFetchUrl.endsWith('.prisma') || text.includes('model ') ? 'schema.prisma' : 'schema.sql';
              fs.writeFileSync(path.join(cloneDir, fileName), text, 'utf-8');
              const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
              result.projectName = path.basename(targetFetchUrl);
              return NextResponse.json({ success: true, data: result });
            }
          } else {
            lastError = `HTTP ${specRes.status} from ${targetFetchUrl}: ${specRes.statusText}`;
          }
        } catch (specErr) {
          lastError = specErr.message;
          console.warn('HTTP fetch attempt failed/skipped, falling back to Git repository strategies:', specErr.message);
        }
      }
    }

    // =========================================================================
    // STEP 3: Git Repository Strategies (GitHub, GitLab, Git CLI)
    // =========================================================================
    const urlPattern = /github\.com\/([^\/]+)\/([^\/\?#]+)/i;
    const match = repoUrl.match(urlPattern);

    const ownerName = match ? match[1] : '';
    let repoName = match ? match[2].replace(/\.git$/i, '') : '';
    if (repoName.includes('/tree/')) repoName = repoName.split('/tree/')[0];
    if (repoName.includes('/blob/')) repoName = repoName.split('/blob/')[0];

    // Branch detection if URL contains /tree/{branch}
    let targetBranch = '';
    const branchMatch = repoUrl.match(/github\.com\/[^\/]+\/[^\/]+\/tree\/([^\/\?#]+)/i);
    if (branchMatch) {
      targetBranch = branchMatch[1];
    }

    // -------------------------------------------------------------------------
    // METHOD 3A: Direct GitHub Public Archive Download (No API rate limit)
    // -------------------------------------------------------------------------
    if (ownerName && repoName && !token) {
      const publicArchiveUrls = targetBranch 
        ? [`https://github.com/${ownerName}/${repoName}/archive/refs/heads/${targetBranch}.zip`]
        : [
            `https://github.com/${ownerName}/${repoName}/archive/refs/heads/main.zip`,
            `https://github.com/${ownerName}/${repoName}/archive/refs/heads/master.zip`,
            `https://codeload.github.com/${ownerName}/${repoName}/zip/refs/heads/main`
          ];

      for (const archiveUrl of publicArchiveUrls) {
        try {
          const zipRes = await fetch(archiveUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 BendLens/1.0' },
            redirect: 'follow',
            signal: AbortSignal.timeout(30000)
          });
          if (zipRes.ok) {
            const arrayBuffer = await zipRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const AdmZipClass = getAdmZip();
            const zip = new AdmZipClass(buffer);
            zip.extractAllTo(cloneDir, true);

            const extractedItems = fs.readdirSync(cloneDir);
            let targetAnalyzeDir = cloneDir;
            if (extractedItems.length === 1 && fs.statSync(path.join(cloneDir, extractedItems[0])).isDirectory()) {
              targetAnalyzeDir = path.join(cloneDir, extractedItems[0]);
            }

            const result = await ProjectAnalyzer.analyzeAsync(targetAnalyzeDir);
            result.projectName = repoName;
            return NextResponse.json({ success: true, data: result });
          }
        } catch (archErr) {
          console.warn('Direct public archive fetch failed:', archErr.message);
        }
      }
    }

    // -------------------------------------------------------------------------
    // METHOD 3B: GitHub API Zipball with Manual Redirect (Handles Private Repos)
    // -------------------------------------------------------------------------
    if (ownerName && repoName) {
      try {
        const apiUrl = targetBranch
          ? `https://api.github.com/repos/${ownerName}/${repoName}/zipball/${targetBranch}`
          : `https://api.github.com/repos/${ownerName}/${repoName}/zipball`;

        const headers = {
          'User-Agent': 'Mozilla/5.0 BendLens/1.0',
          'Accept': 'application/vnd.github+json'
        };

        if (token) {
          headers['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_') || token.startsWith('Bearer ')
            ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`)
            : `token ${token}`;
        }

        let res = await fetch(apiUrl, { 
          headers,
          redirect: 'manual',
          signal: AbortSignal.timeout(30000)
        });

        if (res.status === 302 || res.status === 301) {
          const redirectUrl = res.headers.get('location');
          if (redirectUrl) {
            res = await fetch(redirectUrl, { signal: AbortSignal.timeout(30000) });
          }
        }

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const AdmZipClass = getAdmZip();
          const zip = new AdmZipClass(buffer);
          zip.extractAllTo(cloneDir, true);

          const extractedItems = fs.readdirSync(cloneDir);
          let targetAnalyzeDir = cloneDir;
          if (extractedItems.length === 1 && fs.statSync(path.join(cloneDir, extractedItems[0])).isDirectory()) {
            targetAnalyzeDir = path.join(cloneDir, extractedItems[0]);
          }

          const result = await ProjectAnalyzer.analyzeAsync(targetAnalyzeDir);
          result.projectName = repoName;
          return NextResponse.json({ success: true, data: result });
        } else {
          const errText = await res.text().catch(() => '');
          lastError = `GitHub API returned ${res.status}: ${errText.slice(0, 150) || 'Unauthorized or repo not found.'}`;
        }
      } catch (apiErr) {
        lastError = apiErr.message;
        console.warn('GitHub API download failed, trying branch archive method:', apiErr.message);
      }
    }

    // -------------------------------------------------------------------------
    // METHOD 3C: GitLab Archive Download (Public or Tokenized)
    // -------------------------------------------------------------------------
    const gitlabPattern = /gitlab\.com\/([^\/]+)\/([^\/\?#]+)/i;
    const gitlabMatch = repoUrl.match(gitlabPattern);
    if (gitlabMatch) {
      const glOwner = gitlabMatch[1];
      const glRepo = gitlabMatch[2].replace(/\.git$/i, '');
      const branchesToTry = targetBranch ? [targetBranch] : ['main', 'master'];
      for (const branch of branchesToTry) {
        try {
          const glArchiveUrl = `https://gitlab.com/${glOwner}/${glRepo}/-/archive/${branch}/${glRepo}-${branch}.zip`;
          const glHeaders = { 'User-Agent': 'Mozilla/5.0 BendLens/1.0' };
          if (token) glHeaders['PRIVATE-TOKEN'] = token;
          const glRes = await fetch(glArchiveUrl, { headers: glHeaders, signal: AbortSignal.timeout(30000) });
          if (glRes.ok) {
            const arrayBuffer = await glRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const AdmZipClass = getAdmZip();
            const zip = new AdmZipClass(buffer);
            zip.extractAllTo(cloneDir, true);

            const extractedItems = fs.readdirSync(cloneDir);
            let targetAnalyzeDir = cloneDir;
            if (extractedItems.length === 1 && fs.statSync(path.join(cloneDir, extractedItems[0])).isDirectory()) {
              targetAnalyzeDir = path.join(cloneDir, extractedItems[0]);
            }

            const result = await ProjectAnalyzer.analyzeAsync(targetAnalyzeDir);
            result.projectName = glRepo;
            return NextResponse.json({ success: true, data: result });
          }
        } catch (glErr) {}
      }
    }

    // -------------------------------------------------------------------------
    // METHOD 3D: Local Git CLI Clone
    // -------------------------------------------------------------------------
    try {
      const { execSync } = require('child_process');
      let targetCloneUrl = repoUrl;
      if (token && repoUrl.includes('github.com') && ownerName && repoName) {
        targetCloneUrl = `https://x-access-token:${token}@github.com/${ownerName}/${repoName}.git`;
      }

      const gitSubdir = path.join(cloneDir, 'repo');
      execSync(`git clone --depth 1 "${targetCloneUrl}" "${gitSubdir}"`, {
        timeout: 45000,
        stdio: 'pipe'
      });

      const result = await ProjectAnalyzer.analyzeAsync(gitSubdir);
      result.projectName = repoName || 'repository';
      return NextResponse.json({ success: true, data: result });
    } catch (gitErr) {
      console.error('Git CLI fallback error:', gitErr.message);
      if (!lastError) lastError = gitErr.message;
    }

    // Final Zero-Error Fallback: Run Universal Web & API Crawler
    try {
      const crawlResult = await UniversalApiCrawler.crawl(repoUrl, { maxChunks: 500, concurrency: 24 });
      if (crawlResult && crawlResult.openApiSpec) {
        fs.writeFileSync(path.join(cloneDir, 'openapi.json'), JSON.stringify(crawlResult.openApiSpec, null, 2), 'utf-8');
        if (crawlResult.sqlSchema) {
          fs.writeFileSync(path.join(cloneDir, 'schema.sql'), crawlResult.sqlSchema, 'utf-8');
        }
        const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
        result.projectName = crawlResult.projectName;
        result.crawlerTelemetry = crawlResult.telemetry;
        return NextResponse.json({ success: true, data: result });
      }
    } catch (finalCrawlErr) {
      console.warn('Final crawl fallback error:', finalCrawlErr.message);
    }

    // If all strategies fail
    return NextResponse.json(
      { 
        success: false, 
        error: `Unable to access repository or API specification from "${repoUrl}". ${lastError ? `[Details: ${lastError}]. ` : ''}If private, please ensure your Personal Access Token is valid and has required scopes.` 
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Git Clone Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clone repository or ingest API specification.' },
      { status: 500 }
    );
  }
}
