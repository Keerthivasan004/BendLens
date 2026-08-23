import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import serverCache from '@/lib/serverCache';
import AdmZip from 'adm-zip';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    let repoUrl = (body.repoUrl || '').trim();
    const token = (body.token || '').trim(); // GitHub Personal Access Token (for private repos)

    if (!repoUrl || !repoUrl.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repo)' },
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

    // Parse owner and repo from URL
    const cleanUrl = repoUrl.replace(/\.git$/i, '').replace(/\/+$/, '');
    const urlParts = cleanUrl.split('/');
    const repoName = urlParts[urlParts.length - 1] || 'repository';
    const ownerName = urlParts[urlParts.length - 2] || '';

    let success = false;
    let errorMessage = '';

    // Method 1: GitHub API Zipball Download (Works on Vercel serverless without git CLI)
    if (ownerName && repoName && cleanUrl.includes('github.com')) {
      try {
        const apiUrl = `https://api.github.com/repos/${ownerName}/${repoName}/zipball`;
        const headers = {
          'User-Agent': 'BendLens-Studio/1.0',
          'Accept': 'application/vnd.github.v3+json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(apiUrl, { headers });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);
          zip.extractAllTo(cloneDir, true);

          // If zipball extracted into a single nested folder, resolve it
          const extractedItems = fs.readdirSync(cloneDir);
          let targetAnalyzeDir = cloneDir;
          if (extractedItems.length === 1 && fs.statSync(path.join(cloneDir, extractedItems[0])).isDirectory()) {
            targetAnalyzeDir = path.join(cloneDir, extractedItems[0]);
          }

          const result = ProjectAnalyzer.analyze(targetAnalyzeDir);
          result.projectName = repoName;
          serverCache.setLatest(result);

          return NextResponse.json({ success: true, data: result });
        } else if (res.status === 404 || res.status === 401) {
          errorMessage = 'Repository not found or private. If this is a private repo, please provide a GitHub Personal Access Token (PAT).';
        }
      } catch (apiErr) {
        console.warn('GitHub API download failed, falling back to git CLI:', apiErr.message);
      }
    }

    // Method 2: Git CLI Fallback
    try {
      const { execSync } = require('child_process');
      let targetCloneUrl = repoUrl;
      if (token && repoUrl.includes('github.com')) {
        targetCloneUrl = repoUrl.replace('https://', `https://${token}@`);
      }

      execSync(`git clone --depth 1 "${targetCloneUrl}" "${cloneDir}"`, {
        timeout: 45000,
        stdio: 'pipe'
      });

      const result = ProjectAnalyzer.analyze(cloneDir);
      result.projectName = repoName;
      serverCache.setLatest(result);

      return NextResponse.json({ success: true, data: result });
    } catch (gitErr) {
      console.error('Git CLI fallback failed:', gitErr.message);
      throw new Error(
        errorMessage || 'Failed to clone repository. If this is a private repository, please enter your GitHub Personal Access Token (PAT).'
      );
    }
  } catch (error) {
    console.error('Git Clone Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clone repository.' },
      { status: 500 }
    );
  }
}
