const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

// Generate SVG Icon (must match src/components/Logo.jsx + public/icon.svg)
const svgIcon = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bl-squircle" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5b80ff"/>
      <stop offset="0.55" stop-color="#2547eb"/>
      <stop offset="1" stop-color="#0f1e5e"/>
    </linearGradient>
    <linearGradient id="bl-disc" x1="18" y1="14" x2="46" y2="46" gradientUnits="userSpaceOnUse">
      <stop stop-color="#93b4fd"/>
      <stop offset="0.5" stop-color="#3b63f6"/>
      <stop offset="1" stop-color="#1e30af"/>
    </linearGradient>
    <linearGradient id="bl-ring" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7dd3fc"/>
      <stop offset="0.5" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="bl-glow" cx="0.5" cy="0.42" r="0.65">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="45%" stop-color="#93b4fd" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#2547eb" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#bl-squircle)"/>
  <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.5"/>
  <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#bl-glow)"/>

  <path d="M21 37.5 C21 34.8 43 34.8 43 37.5 L43 42.5 C43 45.2 21 45.2 21 42.5 Z" fill="#16265e" fill-opacity="0.85" stroke="#818cf8" stroke-width="1"/>
  <ellipse cx="32" cy="37.5" rx="11" ry="3.2" fill="#2b3fa8" stroke="#a5b4fc" stroke-width="1"/>
  <path d="M21 28.5 C21 25.8 43 25.8 43 28.5 L43 33.5 C43 36.2 21 36.2 21 33.5 Z" fill="url(#bl-disc)" stroke="#93b4fd" stroke-width="1"/>
  <ellipse cx="32" cy="28.5" rx="11" ry="3.2" fill="#1d37d8" stroke="#bfdbfe" stroke-width="1"/>
  <path d="M21 19.5 C21 16.8 43 16.8 43 19.5 L43 24.5 C43 27.2 21 27.2 21 24.5 Z" fill="#dbe7ff" stroke="#ffffff" stroke-width="1"/>
  <ellipse cx="32" cy="19.5" rx="11" ry="3.2" fill="#f2f6ff" stroke="#ffffff" stroke-width="1.2"/>

  <circle cx="32" cy="31" r="18.5" stroke="url(#bl-ring)" stroke-width="2" stroke-dasharray="13 5" stroke-linecap="round" opacity="0.95"/>
  <circle cx="50.5" cy="17.5" r="2.6" fill="#22d3ee" stroke="#ffffff" stroke-width="1"/>
  <circle cx="13.5" cy="46.5" r="2.6" fill="#818cf8" stroke="#ffffff" stroke-width="1"/>
  <circle cx="32" cy="31" r="2.6" fill="#ffffff"/>
  <circle cx="32" cy="31" r="1.1" fill="#2547eb"/>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const svgPath = path.join(publicDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon, 'utf-8');
console.log('Generated public/icon.svg');

async function generateIcons() {
  try {
    // Generate 256x256 PNG (required for NSIS installer sidebar/header)
    const pngPath = path.join(publicDir, 'icon.png');
    await sharp(Buffer.from(svgIcon))
      .resize(256, 256)
      .png()
      .toFile(pngPath);
    console.log('Generated public/icon.png (256x256)');

    // Also generate 512x512 for high-DPI
    const png512Path = path.join(publicDir, 'icon-512.png');
    await sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(png512Path);
    console.log('Generated public/icon-512.png (512x512)');

    // Generate multi-size ICO with 256x256 (required for NSIS)
    const icoPath = path.join(publicDir, 'icon.ico');
    const icoSizes = [16, 24, 32, 48, 64, 128, 256];
    
    // Generate all PNG sizes first
    const pngBuffers = await Promise.all(
      icoSizes.map(size => sharp(Buffer.from(svgIcon)).resize(size, size).png().toBuffer())
    );
    
    // Write PNGs to temp files for ico conversion
    const tempDir = path.join(publicDir, '..', '.temp-icons');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    for (let i = 0; i < icoSizes.length; i++) {
      const size = icoSizes[i];
      const tempPng = path.join(tempDir, `icon-${size}.png`);
      fs.writeFileSync(tempPng, pngBuffers[i]);
    }
    
    // Use ImageMagick to create multi-size ICO
    try {
      const pngFiles = icoSizes.map(s => `"${path.join(tempDir, `icon-${s}.png`)}"`).join(' ');
      execSync(`magick convert ${pngFiles} -colors 256 "${icoPath}"`, { stdio: 'ignore' });
      console.log('Generated public/icon.ico (multi-size: 16,24,32,48,64,128,256 via ImageMagick)');
    } catch {
      // Fallback: create ICO using the largest PNG (sharp can't write ICO directly)
      // Write the 256x256 PNG as .ico (electron-builder may accept it)
      await sharp(Buffer.from(svgIcon))
        .resize(256, 256)
        .png()
        .toFile(icoPath);
      console.log('Generated public/icon.ico (as 256x256 PNG, fallback)');
    }
    
    // Clean up temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Icon generation failed:', err.message);
    process.exit(1);
  }
}

generateIcons();