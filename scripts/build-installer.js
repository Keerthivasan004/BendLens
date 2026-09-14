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

REM --- Existing-installation detection ---------------------------------
REM A re-download installed OVER a running copy used to produce locked /
REM half-written files, leaving the "reinstalled" app broken. Stop any
REM running BendLens first, then install cleanly over the old copy.
if exist "%INSTALL_DIR%\\package.json" (
  echo [*] Existing BendLens installation detected at %INSTALL_DIR%.
  echo [*] Stopping any running BendLens processes before updating...
  taskkill /IM BendLens.exe /F >nul 2>&1
  taskkill /FI "WINDOWTITLE eq BendLens*" /F >nul 2>&1
  timeout /t 2 /nobreak >nul
  echo [*] Updating the existing installation in place...
) else (
  echo [*] No previous installation found - performing a fresh install.
)
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

echo [*] Writing full-cleanup uninstaller into %INSTALL_DIR% ...
(
echo @echo off
echo title BendLens Uninstall - Remove App + All Data
echo echo [*] Stopping any running BendLens processes...
echo taskkill /IM BendLens.exe /F ^>nul 2^>^&1
echo timeout /t 2 /nobreak ^>nul
echo echo [*] Removing application folders...
echo if exist "%%LOCALAPPDATA%%\\BendLens" rmdir /s /q "%%LOCALAPPDATA%%\\BendLens"
echo if exist "%%LOCALAPPDATA%%\\Programs\\BendLens" rmdir /s /q "%%LOCALAPPDATA%%\\Programs\\BendLens"
echo echo [*] Removing all related BendLens application data...
echo if exist "%%APPDATA%%\\BendLens" rmdir /s /q "%%APPDATA%%\\BendLens"
echo if exist "%%APPDATA%%\\com.bendlens.studio" rmdir /s /q "%%APPDATA%%\\com.bendlens.studio"
echo if exist "%%TEMP%%\\.bendlens_history.json" del /f /q "%%TEMP%%\\.bendlens_history.json"
echo echo [*] Removing shortcuts...
echo powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Path ^([System.IO.Path]::Combine^([Environment]::GetFolderPath^('Desktop'^), 'BendLens.lnk'^)^) -Force -ErrorAction SilentlyContinue; Remove-Item -Path ^([System.IO.Path]::Combine^([Environment]::GetFolderPath^('StartMenu'^), 'Programs', 'BendLens.lnk'^)^) -Force -ErrorAction SilentlyContinue; "
echo echo [*] BendLens fully uninstalled - app files and all data removed.
) > "%INSTALL_DIR%\\Uninstall-BendLens.cmd"

echo.
echo ====================================================================
echo   BendLens Installed Successfully!
echo   A shortcut 'BendLens' has been created on your Desktop.
echo   To remove BendLens completely later (app + all data), run:
echo     %INSTALL_DIR%\\Uninstall-BendLens.cmd
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

// 3. Generate the full-cleanup Uninstaller (Uninstall-BendLens.cmd).
// Deleting the app folder alone leaves Electron userData behind
// (%APPDATA%\BendLens: Cache, GPUCache, extracted-app, Local Storage),
// the temp analysis history, and desktop shortcuts. This uninstaller wipes
// ALL BendLens-related data so no stale state survives a reinstall.
const uninstallerScript = `@echo off
title BendLens Uninstall - Remove App + All Data
echo ====================================================================
echo   Uninstalling BendLens Desktop Application (App + All Data)
echo ====================================================================
echo.

echo [*] Stopping any running BendLens processes...
taskkill /IM BendLens.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BendLens*" /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [*] Removing application folders...
if exist "%LOCALAPPDATA%\\BendLens" rmdir /s /q "%LOCALAPPDATA%\\BendLens"
if exist "%LOCALAPPDATA%\\Programs\\BendLens" rmdir /s /q "%LOCALAPPDATA%\\Programs\\BendLens"

echo [*] Removing all related BendLens application data...
if exist "%APPDATA%\\BendLens" rmdir /s /q "%APPDATA%\\BendLens"
if exist "%APPDATA%\\com.bendlens.studio" rmdir /s /q "%APPDATA%\\com.bendlens.studio"
if exist "%TEMP%\\.bendlens_history.json" del /f /q "%TEMP%\\.bendlens_history.json"

echo [*] Removing shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Remove-Item -Path ([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')) -Force -ErrorAction SilentlyContinue; " ^
  "Remove-Item -Path ([System.IO.Path]::Combine([Environment]::GetFolderPath('StartMenu'), 'Programs', 'BendLens.lnk')) -Force -ErrorAction SilentlyContinue; "

echo.
echo ====================================================================
echo   BendLens has been fully uninstalled.
echo   App files, cached engine, history and shortcuts were all removed.
echo ====================================================================
echo.

exit /b 0
`;

const uninstallPath = path.join(downloadsDir, 'Uninstall-BendLens.cmd');
fs.writeFileSync(uninstallPath, uninstallerScript, 'utf-8');

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
console.log('-> ' + uninstallPath);
console.log('Real Windows installers (.exe) are produced by `npm run dist` into dist/.');
