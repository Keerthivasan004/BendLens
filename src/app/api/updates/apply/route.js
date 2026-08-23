import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const projectRoot = process.cwd();
    const isGitRepo = fs.existsSync(path.join(projectRoot, '.git'));

    let output = '';

    if (isGitRepo) {
      // 1. Pull latest updates from Git
      const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot, timeout: 30000 });
      output = stdout;
    } else {
      output = 'BendLens is running the latest standalone package.';
    }

    return NextResponse.json({
      success: true,
      message: 'BendLens engine updated successfully!',
      details: output
    });
  } catch (error) {
    console.error('Update Apply Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to automatically apply update'
    }, { status: 500 });
  }
}
