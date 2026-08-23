import { NextResponse } from 'next/server';
import ProjectAnalyzer from '@/lib/analyzer';
import serverCache from '@/lib/serverCache';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const repoUrl = (body.repoUrl || '').trim();

    if (!repoUrl || !repoUrl.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Please provide a valid Git / GitHub repository URL' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), '.temp_scans');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const repoName = repoUrl.split('/').pop().replace(/\.git$/i, '') || 'cloned_repo';
    const scanId = `git_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cloneDir = path.join(uploadsDir, scanId);

    // Run shallow git clone locally
    execSync(`git clone --depth 1 "${repoUrl}" "${cloneDir}"`, {
      timeout: 45000,
      stdio: 'pipe'
    });

    const result = ProjectAnalyzer.analyze(cloneDir);
    result.projectName = repoName;
    
    serverCache.setLatest(result);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Git Clone Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clone repository. Ensure git is installed and repository is public.' },
      { status: 500 }
    );
  }
}
