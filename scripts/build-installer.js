const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('Generating BendLens Standalone Executable Package...');

const projectRoot = path.join(__dirname, '..');
const downloadsDir = path.join(projectRoot, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Ensure BendLens.exe is built if possible
const rootExe = path.join(projectRoot, 'BendLens.exe');
const downloadsExe = path.join(downloadsDir, 'BendLens.exe');
if (fs.existsSync(rootExe) && !fs.existsSync(downloadsExe)) {
  fs.copyFileSync(rootExe, downloadsExe);
}

// 1. Create the complete embedded payload ZIP
const zip = new AdmZip();
const INCLUDE_DIRS = ['src', 'public', 'electron', 'scripts', 'sample_project'];
const INCLUDE_FILES = [
  'BendLens.exe',
  'BendLens.bat',
  'package.json',
  'run.bat',
  'run.js',
  'README.md',
  'tailwind.config.js',
  'next.config.js',
  'postcss.config.js',
  'jsconfig.json'
];

for (const dir of INCLUDE_DIRS) {
  const fullDirPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullDirPath)) {
    zip.addLocalFolder(fullDirPath, dir);
  }
}

for (const file of INCLUDE_FILES) {
  const fullFilePath = path.join(projectRoot, file);
  if (fs.existsSync(fullFilePath)) {
    zip.addLocalFile(fullFilePath);
  }
}

const payloadBase64 = zip.toBuffer().toString('base64');

// 2. Generate the Single-Click Executable Installer Script (BendLens-Setup.cmd / .bat)
const installerScript = `@echo off
title BendLens Desktop Setup - 100%% Private Architecture Platform
echo ====================================================================
echo   Installing BendLens Desktop Application (Native Studio)
echo ====================================================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\\BendLens"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [*] Extracting BendLens Desktop Engine into %INSTALL_DIR% ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$b64 = '${payloadBase64}'; " ^
  "$bytes = [System.Convert]::FromBase64String($b64); " ^
  "$zipPath = Join-Path $env:TEMP 'BendLens-Payload.zip'; " ^
  "[System.IO.File]::WriteAllBytes($zipPath, $bytes); " ^
  "Expand-Archive -Path $zipPath -DestinationPath $env:LOCALAPPDATA\\BendLens -Force; " ^
  "Remove-Item -Path $zipPath -Force; "

echo [*] Creating Desktop Shortcut with BendLens Icon...

set "TARGET_EXE=%INSTALL_DIR%\\BendLens.exe"
if not exist "%TARGET_EXE%" set "TARGET_EXE=%INSTALL_DIR%\\BendLens.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -comObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); " ^
  "$Shortcut.TargetPath = '%TARGET_EXE%'; " ^
  "$Shortcut.WorkingDirectory = '%INSTALL_DIR%'; " ^
  "$Shortcut.IconLocation = '%INSTALL_DIR%\\public\\icon.ico'; " ^
  "$Shortcut.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; " ^
  "$Shortcut.Save();"

echo.
echo ====================================================================
echo   BendLens Installed Successfully!
echo   A shortcut 'BendLens' has been created on your Desktop.
echo ====================================================================
echo.
echo [*] Launching BendLens Desktop Application now...
start "" "%TARGET_EXE%"

exit /b 0
`;

// Save installer as BendLens-Setup.cmd (batch payload).
// NOTE: never write batch text to a `.exe` path — Windows cannot execute a
// renamed batch file, and Next.js would serve it statically as a broken
// "executable". Real .exe installers come only from `npm run dist`
// (electron-builder NSIS + portable targets in dist/).
const cmdPath = path.join(downloadsDir, 'BendLens-Setup.cmd');

fs.writeFileSync(cmdPath, installerScript, 'utf-8');

// Remove any legacy fake `BendLens-Setup.exe` (batch text with .exe extension).
const legacyFakeExe = path.join(downloadsDir, 'BendLens-Setup.exe');
try {
  if (fs.existsSync(legacyFakeExe)) {
    const head = fs.readFileSync(legacyFakeExe).subarray(0, 2).toString('utf8');
    const isMz = fs.readFileSync(legacyFakeExe).subarray(0, 2).equals(Buffer.from([0x4d, 0x5a]));
    if (!isMz || head.startsWith('@e')) {
      fs.unlinkSync(legacyFakeExe);
      console.log('Removed legacy fake executable: ' + legacyFakeExe);
    }
  }
} catch (e) {
  console.warn('Could not clean legacy fake exe:', e.message);
}

console.log('Successfully generated:');
console.log('-> ' + cmdPath);
console.log('Real Windows installers (.exe) are produced by `npm run dist` into dist/.');
