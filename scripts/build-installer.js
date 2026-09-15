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

// 1. Create the complete embedded payload ZIP (source bundle — requires Node.js + `npm install` on user machine)
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

// 2. Generate the Professional Installer Script (BendLens-Setup.cmd)
const installerScript = `@echo off
title BendLens Desktop Setup - 100%% Private Architecture Platform
echo ====================================================================
echo   BendLens Desktop Application Installer
echo   Universal Backend Architecture & Blast Platform
echo ====================================================================
echo.

REM ========================================================================
REM CONFIGURATION
REM ========================================================================
set "DEFAULT_INSTALL_DIR=%LOCALAPPDATA%\\Programs\\BendLens"
set "APP_NAME=BendLens"
set "SHORTCUT_NAME=BendLens"

REM ========================================================================
REM HELPER FUNCTIONS
REM ========================================================================

:ASK_YES_NO
setlocal
set "PROMPT=%~1"
set "DEFAULT=%~2"
set "RESULT_VAR=%~3"
choice /C YN /N /M "%PROMPT% [%DEFAULT%] "
if %ERRORLEVEL% equ 1 (
  endlocal & set "%RESULT_VAR%=Y"
) else (
  endlocal & set "%RESULT_VAR%=N"
)
goto :EOF

:ASK_PATH
setlocal
set "PROMPT=%~1"
set "DEFAULT=%~2"
set "RESULT_VAR=%~3"
set /P "INPUT=%PROMPT% [%DEFAULT%]: "
if "!INPUT!"=="" (
  endlocal & set "%RESULT_VAR%=%DEFAULT%"
) else (
  endlocal & set "%RESULT_VAR%=!INPUT!"
)
goto :EOF

:STOP_BENDLENS
echo [*] Stopping any running BendLens processes...
taskkill /IM BendLens.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BendLens*" /F >nul 2>&1
timeout /t 2 /nobreak >nul
goto :EOF

:CREATE_SHORTCUTS
setlocal
set "TARGET_EXE=%~1"
set "WORK_DIR=%~2"
set "ICON_PATH=%~3"
set "CREATE_DESKTOP=%~4"
set "CREATE_STARTMENU=%~5"

if "%CREATE_DESKTOP%"=="Y" (
  echo [*] Creating Desktop shortcut...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$WshShell = New-Object -comObject WScript.Shell; " ^
    "$Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), '%SHORTCUT_NAME%.lnk')); " ^
    "$Shortcut.TargetPath = '%TARGET_EXE%'; " ^
    "$Shortcut.WorkingDirectory = '%WORK_DIR%'; " ^
    "$Shortcut.IconLocation = '%ICON_PATH%'; " ^
    "$Shortcut.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; " ^
    "$Shortcut.Save();" 2>nul
)

if "%CREATE_STARTMENU%"=="Y" (
  echo [*] Creating Start Menu shortcut...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$WshShell = New-Object -comObject WScript.Shell; " ^
    "$Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('StartMenu'), 'Programs', '%SHORTCUT_NAME%.lnk')); " ^
    "$Shortcut.TargetPath = '%TARGET_EXE%'; " ^
    "$Shortcut.WorkingDirectory = '%WORK_DIR%'; " ^
    "$Shortcut.IconLocation = '%ICON_PATH%'; " ^
    "$Shortcut.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; " ^
    "$Shortcut.Save();" 2>nul
)
goto :EOF

:WRITE_UNINSTALLER
setlocal
set "INSTALL_DIR=%~1"
(
echo @echo off
echo title BendLens Uninstall - Remove App ^& All Data
echo echo ====================================================================
echo echo   Uninstalling BendLens Desktop Application (App + All Data)
echo echo ====================================================================
echo echo.
echo echo [*] Stopping any running BendLens processes...
echo taskkill /IM BendLens.exe /F ^>nul 2^>^&1
echo taskkill /FI "WINDOWTITLE eq BendLens*" /F ^>nul 2^>^&1
echo timeout /t 2 /nobreak ^>nul
echo echo.
echo echo [*] Removing application folders...
echo if exist "%%LOCALAPPDATA%%\\Programs\\BendLens" rmdir /s /q "%%LOCALAPPDATA%%\\Programs\\BendLens"
echo if exist "%%LOCALAPPDATA%%\\BendLens" rmdir /s /q "%%LOCALAPPDATA%%\\BendLens"
echo echo.
echo echo [*] Removing all related BendLens application data...
echo if exist "%%APPDATA%%\\BendLens" rmdir /s /q "%%APPDATA%%\\BendLens"
echo if exist "%%APPDATA%%\\com.bendlens.studio" rmdir /s /q "%%APPDATA%%\\com.bendlens.studio"
echo if exist "%%TEMP%%\\.bendlens_history.json" del /f /q "%%TEMP%%\\.bendlens_history.json"
echo echo.
echo echo [*] Removing shortcuts...
echo powershell -NoProfile -ExecutionPolicy Bypass -Command ^
echo   "Remove-Item -Path ^([System.IO.Path]::Combine^([Environment]::GetFolderPath^('Desktop'^), 'BendLens.lnk'^)^) -Force -ErrorAction SilentlyContinue; " ^
echo   "Remove-Item -Path ^([System.IO.Path]::Combine^([Environment]::GetFolderPath^('StartMenu'^), 'Programs', 'BendLens.lnk'^)^) -Force -ErrorAction SilentlyContinue; "
echo echo.
echo echo ====================================================================
echo echo   BendLens has been fully uninstalled.
echo echo   App files, cached engine, history and shortcuts were all removed.
echo echo ====================================================================
echo echo.
) > "%INSTALL_DIR%\\Uninstall-BendLens.cmd"
goto :EOF

:BACKUP_USER_DATA
setlocal
set "INSTALL_DIR=%~1"
set "BACKUP_DIR=%TEMP%\\BendLens_Backup_%RANDOM%"
echo [*] Backing up user data...
if exist "%INSTALL_DIR%\\userData" (
  mkdir "%BACKUP_DIR%" 2>nul
  xcopy "%INSTALL_DIR%\\userData" "%BACKUP_DIR%\\userData" /E /I /H /K /Y >nul
  echo [%BACKUP_DIR%] > "%INSTALL_DIR%\\.bendlens_backup_path"
)
goto :EOF

:RESTORE_USER_DATA
setlocal
set "INSTALL_DIR=%~1"
if exist "%INSTALL_DIR%\\.bendlens_backup_path" (
  set /P "BACKUP_DIR=" < "%INSTALL_DIR%\\.bendlens_backup_path"
  if exist "%BACKUP_DIR%\\userData" (
    echo [*] Restoring user data...
    mkdir "%INSTALL_DIR%\\userData" 2>nul
    xcopy "%BACKUP_DIR%\\userData" "%INSTALL_DIR%\\userData" /E /I /H /K /Y >nul
  )
  del "%INSTALL_DIR%\\.bendlens_backup_path" 2>nul
  rmdir "%BACKUP_DIR%" /s /q 2>nul
)
goto :EOF

REM ========================================================================
REM MAIN INSTALLER LOGIC
REM ========================================================================

echo [*] Welcome to the BendLens Desktop Installer!
echo.

REM --- Detect existing installation ---
set "INSTALL_DIR="
set "IS_UPGRADE=N"
set "EXISTING_DIR="

REM Check NSIS default location first
if exist "%DEFAULT_INSTALL_DIR%\\package.json" set "EXISTING_DIR=%DEFAULT_INSTALL_DIR%"
REM Check legacy location
if exist "%LOCALAPPDATA%\\BendLens\\package.json" if not defined EXISTING_DIR set "EXISTING_DIR=%LOCALAPPDATA%\\BendLens"
REM Check Program Files
if exist "%PROGRAMFILES%\\BendLens\\package.json" if not defined EXISTING_DIR set "EXISTING_DIR=%PROGRAMFILES%\\BendLens"

if defined EXISTING_DIR (
  echo [*] Existing BendLens installation detected at: %EXISTING_DIR%
  echo.
  call :ASK_YES_NO "Upgrade this installation (keeps your data)?" "Y" UPGRADE_CHOICE
  if "%UPGRADE_CHOICE%"=="Y" (
    set "IS_UPGRADE=Y"
    set "INSTALL_DIR=%EXISTING_DIR%"
  ) else (
    call :ASK_YES_NO "Perform a clean install instead (removes old data)?" "Y" CLEAN_CHOICE
    if "%CLEAN_CHOICE%"=="Y" (
      echo [*] Removing old installation...
      call :STOP_BENDLENS
      rmdir /s /q "%EXISTING_DIR%" 2>nul
      set "INSTALL_DIR=%DEFAULT_INSTALL_DIR%"
    ) else (
      echo [*] Install cancelled by user.
      pause
      exit /b 1
    )
  )
) else (
  echo [*] No previous installation found.
  set "INSTALL_DIR=%DEFAULT_INSTALL_DIR%"
)

echo.
echo [*] Install location: %INSTALL_DIR%
call :ASK_PATH "Change install location?" "%INSTALL_DIR%" INSTALL_DIR
echo.

REM --- Shortcut options (professional installer style) ---
echo [*] Shortcut Options
call :ASK_YES_NO "Create Desktop shortcut?" "Y" CREATE_DESKTOP
call :ASK_YES_NO "Create Start Menu shortcut?" "Y" CREATE_STARTMENU
echo.

REM --- Confirm installation ---
echo ====================================================================
echo   Ready to Install BendLens
echo ====================================================================
echo   Location: %INSTALL_DIR%
echo   Desktop Shortcut: %CREATE_DESKTOP%
echo   Start Menu Shortcut: %CREATE_STARTMENU%
echo ====================================================================
call :ASK_YES_NO "Proceed with installation?" "Y" CONFIRM
if "%CONFIRM%"=="N" (
  echo [*] Install cancelled by user.
  pause
  exit /b 1
)
echo.

REM --- Stop any running instance before install ---
call :STOP_BENDLENS

REM --- Backup user data if upgrading ---
if "%IS_UPGRADE%"=="Y" call :BACKUP_USER_DATA "%INSTALL_DIR%"

REM --- Clean the install directory (but preserve userData if upgrading) ---
if exist "%INSTALL_DIR%" (
  if "%IS_UPGRADE%"=="Y" (
    REM Remove everything except userData
    for /d %%D in ("%INSTALL_DIR%\\*") do (
      if /I not "%%~nxD"=="userData" rmdir /s /q "%%D" 2>nul
    )
    for %%F in ("%INSTALL_DIR%\\*") do (
      if /I not "%%~nxF"=="userData" del /f /q "%%F" 2>nul
    )
  ) else (
    rmdir /s /q "%INSTALL_DIR%" 2>nul
  )
)
mkdir "%INSTALL_DIR%"

REM --- Extract payload ---
echo [*] Extracting BendLens Desktop Engine...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$b64 = '${payloadBase64}'; " ^
  "$bytes = [System.Convert]::FromBase64String($b64); " ^
  "$zipPath = Join-Path $env:TEMP 'BendLens-Payload.zip'; " ^
  "[System.IO.File]::WriteAllBytes($zipPath, $bytes); " ^
  "Expand-Archive -Path $zipPath -DestinationPath '%INSTALL_DIR%' -Force; " ^
  "Remove-Item -Path $zipPath -Force; " 2>&1 | findstr /V "^$"

REM --- Restore user data if upgrading ---
if "%IS_UPGRADE%"=="Y" call :RESTORE_USER_DATA "%INSTALL_DIR%"

REM --- Determine launch target ---
set "TARGET_EXE=%INSTALL_DIR%\\BendLens.exe"
if not exist "%TARGET_EXE%" set "TARGET_EXE=%INSTALL_DIR%\\BendLens.bat"
set "ICON_PATH=%INSTALL_DIR%\\public\\icon.ico"

REM --- Create shortcuts ---
call :CREATE_SHORTCUTS "%TARGET_EXE%" "%INSTALL_DIR%" "%ICON_PATH%" "%CREATE_DESKTOP%" "%CREATE_STARTMENU%"

REM --- Write uninstaller ---
call :WRITE_UNINSTALLER "%INSTALL_DIR%"

echo.
echo ====================================================================
echo   BendLens Installed Successfully!
echo ====================================================================
if "%CREATE_DESKTOP%"=="Y" echo   [x] Desktop shortcut created
if "%CREATE_STARTMENU%"=="Y" echo   [x] Start Menu shortcut created
echo   Install location: %INSTALL_DIR%
echo   To uninstall (removes app + all data): %INSTALL_DIR%\\Uninstall-BendLens.cmd
echo ====================================================================
echo.

REM --- Launch application ---
echo [*] Launching BendLens Desktop Application...
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
