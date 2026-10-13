import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
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

    if (!repoUrl || !repoUrl.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid URL (GitHub repo, Git repo, or OpenAPI/Swagger URL).' },
        { status: 400 }
      );
    }

    // Always use os.tmpdir() for serverless / Vercel compatibility
    const uploadsDir = path.join(os.tmpdir(), 'bendlens_temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const scanId = `git_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cloneDir = path.join(uploadsDir, scanId);
    fs.mkdirSync(cloneDir, { recursive: true });

    // =========================================================================
    // METHOD 0: Direct OpenAPI / Swagger JSON/YAML Specification URL
    // =========================================================================
    const isSpecUrl = /\.(?:json|yaml|yml)(\?.*)?$/i.test(repoUrl) ||
      /(?:openapi|swagger|api-docs|api-spec)/i.test(repoUrl);

    if (isSpecUrl || !repoUrl.includes('github.com')) {
      try {
        const fetchHeaders = {
          'User-Agent': 'BendLens-Studio/1.0',
          'Accept': 'application/json, application/yaml, text/yaml, text/plain, */*'
        };
        if (token) {
          fetchHeaders['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_') || token.startsWith('Bearer ')
            ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`)
            : `token ${token}`;
        }

        const specRes = await fetch(repoUrl, {
          headers: fetchHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(15000)
        });

        if (specRes.ok) {
          const text = await specRes.text();
          const isJsonOrYaml = text.trim().startsWith('{') || text.trim().startsWith('[') || text.includes('paths:');
          const hasApiMarkers = text.includes('"swagger"') || text.includes('"openapi"') || 
                                text.includes('swagger:') || text.includes('openapi:') || 
                                text.includes('paths:') || text.includes('"paths"');

          if (isJsonOrYaml && hasApiMarkers) {
            const isYaml = !text.trim().startsWith('{');
            const targetFileName = isYaml ? 'openapi.yaml' : 'openapi.json';
            fs.writeFileSync(path.join(cloneDir, targetFileName), text, 'utf-8');

            let projectName = 'API Specification';
            try {
              if (!isYaml) {
                const parsed = JSON.parse(text);
                if (parsed.info && parsed.info.title) projectName = parsed.info.title;
              } else {
                const titleMatch = text.match(/title\s*:\s*['"]?([^'"\n]+)['"]?/i);
                if (titleMatch) projectName = titleMatch[1].trim();
              }
            } catch {}

            const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
            result.projectName = projectName;
            return NextResponse.json({ success: true, data: result });
          }
        }
      } catch (specErr) {
        // Not a direct HTTP spec URL, proceed to Git repo strategies
        console.warn('Direct spec fetch skipped/failed, proceeding to Git clone:', specErr.message);
      }
    }

    // Robust parsing of owner and repo name
    // Matches https://github.com/owner/repo, https://github.com/owner/repo.git, etc.
    const urlPattern = /github\.com\/([^\/]+)\/([^\/\?#]+)/i;
    const match = repoUrl.match(urlPattern);
    
    const ownerName = match ? match[1] : '';
    const repoName = match ? match[2].replace(/\.git$/i, '') : 'repository';

    let success = false;
    let lastError = '';

    // =========================================================================
    // METHOD 1: GitHub API Zipball with Manual Redirect Handling (Handles Private Repos)
    // =========================================================================
    if (ownerName && repoName) {
      try {
        const apiUrl = `https://api.github.com/repos/${ownerName}/${repoName}/zipball`;
        const headers = {
          'User-Agent': 'BendLens-Studio/1.0',
          'Accept': 'application/vnd.github+json'
        };

        if (token) {
          // Supports classic PAT ('token ...') and fine-grained PAT ('Bearer ...')
          headers['Authorization'] = token.startsWith('ghp_') || token.startsWith('github_pat_') 
            ? `Bearer ${token}` 
            : `token ${token}`;
        }

        // Use manual redirect so Authorization header isn't dropped by Node fetch
        let res = await fetch(apiUrl, { 
          headers,
          redirect: 'manual'
        });

        // Follow 302 / 301 redirect to pre-authenticated codeload URL
        if (res.status === 302 || res.status === 301) {
          const redirectUrl = res.headers.get('location');
          if (redirectUrl) {
            res = await fetch(redirectUrl);
          }
        }

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const AdmZipClass = getAdmZip();
          const zip = new AdmZipClass(buffer);
          zip.extractAllTo(cloneDir, true);

          // Find extracted root folder
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
          lastError = `GitHub API returned ${res.status}: ${errText || 'Unauthorized or repo not found.'}`;
        }
      } catch (apiErr) {
        lastError = apiErr.message;
        console.warn('GitHub API download failed, trying direct archive method:', apiErr.message);
      }
    }

    // =========================================================================
    // METHOD 2: Direct Archive Download with Token (Fallback for branches)
    // =========================================================================
    if (ownerName && repoName && token) {
      for (const branch of ['main', 'master']) {
        try {
          const branchUrl = `https://raw.githubusercontent.com/${ownerName}/${repoName}/${branch}/package.json`;
          const checkRes = await fetch(branchUrl, {
            headers: {
              'Authorization': `token ${token}`,
              'User-Agent': 'BendLens-Studio/1.0'
            }
          });
          if (checkRes.ok) {
            // Branch confirmed
            const archiveUrl = `https://api.github.com/repos/${ownerName}/${repoName}/zipball/${branch}`;
            let zipRes = await fetch(archiveUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'BendLens-Studio/1.0',
                'Accept': 'application/vnd.github+json'
              },
              redirect: 'manual'
            });
            if (zipRes.status === 302 || zipRes.status === 301) {
              const redir = zipRes.headers.get('location');
              if (redir) zipRes = await fetch(redir);
            }
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
          }
        } catch (branchErr) {}
      }
    }

    // =========================================================================
    // METHOD 2B: GitLab Archive Download (Public or Tokenized)
    // =========================================================================
    const gitlabPattern = /gitlab\.com\/([^\/]+)\/([^\/\?#]+)/i;
    const gitlabMatch = repoUrl.match(gitlabPattern);
    if (gitlabMatch) {
      const glOwner = gitlabMatch[1];
      const glRepo = gitlabMatch[2].replace(/\.git$/i, '');
      for (const branch of ['main', 'master']) {
        try {
          const glArchiveUrl = `https://gitlab.com/${glOwner}/${glRepo}/-/archive/${branch}/${glRepo}-${branch}.zip`;
          const glHeaders = { 'User-Agent': 'BendLens-Studio/1.0' };
          if (token) glHeaders['PRIVATE-TOKEN'] = token;
          const glRes = await fetch(glArchiveUrl, { headers: glHeaders });
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

    // =========================================================================
    // METHOD 3: Git CLI Clone (When running in environments with git installed)
    // =========================================================================
    try {
      const { execSync } = require('child_process');
      let targetCloneUrl = repoUrl;
      if (token && repoUrl.includes('github.com')) {
        targetCloneUrl = `https://x-access-token:${token}@github.com/${ownerName}/${repoName}.git`;
      }

      execSync(`git clone --depth 1 "${targetCloneUrl}" "${cloneDir}"`, {
        timeout: 45000,
        stdio: 'pipe'
      });

      const result = await ProjectAnalyzer.analyzeAsync(cloneDir);
      result.projectName = repoName || 'repository';

      return NextResponse.json({ success: true, data: result });
    } catch (gitErr) {
      console.error('Git CLI fallback error:', gitErr.message);
    }

    // If all methods exhausted
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unable to access repository or API specification from the provided URL. If private, please ensure your Personal Access Token is valid.' 
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Git Clone Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clone repository.' },
      { status: 500 }
    );
  }
}
