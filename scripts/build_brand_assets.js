const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildBrandAssets() {
  const projectRoot = path.join(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const svgPath = path.join(publicDir, 'icon.svg');
  const png512Path = path.join(publicDir, 'icon.png');

  if (!fs.existsSync(svgPath)) {
    throw new Error('public/icon.svg does not exist');
  }

  console.log('[1/3] Checking brand icon PNG...');
  if (!fs.existsSync(png512Path)) {
    // If Edge is present, use native Edge headless screenshot
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(edgePath)) {
      const tempHtml = path.join(__dirname, 'temp_icon.html');
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      fs.writeFileSync(tempHtml, `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;width:512px;height:512px;background:transparent;">${svgContent}</body></html>`);
      try {
        execSync(`"${edgePath}" --headless --screenshot="${png512Path}" --window-size=512,512 "${tempHtml}"`);
        if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
      } catch (e) {
        console.warn('Edge rasterization fallback skipped:', e.message);
      }
    }
  }

  // Ensure root icon.png is synchronized
  if (fs.existsSync(png512Path)) {
    fs.copyFileSync(png512Path, path.join(projectRoot, 'icon.png'));
    console.log('[1/3] Synchronized high-res PNG at', png512Path);
  }

  console.log('[2/3] Checking multi-size Windows .ico...');
  const psConvertScript = path.join(__dirname, 'convert_png_to_ico.ps1');
  const icoPublic = path.join(publicDir, 'icon.ico');
  const forceRebuild = process.argv.includes('--force');

  if (fs.existsSync(psConvertScript) && fs.existsSync(png512Path)) {
    if (!fs.existsSync(icoPublic) || forceRebuild) {
      console.log('Generating multi-size Windows .ico with System.Drawing...');
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psConvertScript}" -PngPath "${png512Path}" -IcoPath "${icoPublic}"`, {
        stdio: 'inherit'
      });
    } else {
      console.log('[2/3] icon.ico is already present, skipping redundant PowerShell generation.');
    }
  }

  // Copy ICO to root and downloads
  const icoRoot = path.join(projectRoot, 'icon.ico');
  const downloadsDir = path.join(publicDir, 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
  const icoDownloads = path.join(downloadsDir, 'icon.ico');

  if (fs.existsSync(icoPublic)) {
    fs.copyFileSync(icoPublic, icoRoot);
    fs.copyFileSync(icoPublic, icoDownloads);
  }

  console.log('[3/3] Brand asset synchronization complete:');
  console.log(' - ' + svgPath);
  console.log(' - ' + png512Path);
  console.log(' - ' + icoPublic);
  console.log(' - ' + icoRoot);
}

buildBrandAssets().catch(err => {
  console.error('Build brand assets failed:', err);
  process.exit(1);
});
