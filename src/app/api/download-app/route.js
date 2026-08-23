import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const projectRoot = process.cwd();
    const exePath = path.join(projectRoot, 'public', 'downloads', 'BendLens.exe');

    // Ensure the binary is compiled and available
    if (!fs.existsSync(exePath)) {
      const { execSync } = require('child_process');
      const cscCompiler = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
      const csSource = path.join(projectRoot, 'scripts', 'BendLensLauncher.cs');
      execSync(`"${cscCompiler}" /target:winexe /platform:anycpu /optimize+ /out:"${exePath}" "${csSource}" /reference:System.Windows.Forms.dll,System.Drawing.dll,System.dll,Microsoft.CSharp.dll`, { cwd: projectRoot });
    }

    const fileBuffer = fs.readFileSync(exePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Disposition': 'attachment; filename="BendLens.exe"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Download executable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download BendLens.exe executable' },
      { status: 500 }
    );
  }
}
