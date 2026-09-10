@echo off
title BendLens Studio - Universal Backend Architecture Platform
echo ========================================================
echo   Starting BendLens Desktop Studio (100%% Private)
echo ========================================================

cd /d "%~dp0"

:: 1. Ensure Desktop Shortcut exists (only create if missing to avoid PowerShell lag)
if not exist "%USERPROFILE%\Desktop\BendLens.lnk" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); $s.TargetPath = '%~dp0BendLens.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0public\icon.ico'; $s.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; $s.Save()" 2>nul
)

:: 2. If Electron Native Desktop runtime is available, launch immediately (<150ms)!
if exist "node_modules\electron\dist\electron.exe" (
    echo [*] Launching Native Desktop Studio...
    start "" "node_modules\electron\dist\electron.exe" "."
    exit /b 0
)

:: 3. Web Mode Fallback:
:: Ensure dependencies exist
if not exist "node_modules" (
    echo [*] Installing local dependencies (first-time only)...
    call npm install
)

:: Auto-detect production build for ultra-fast startup (~300ms) vs dev mode
set "START_CMD=npm run dev"
if exist ".next" (
    set "START_CMD=npm run start"
    echo [*] Fast Production Mode active
)

echo [*] Starting BendLens Local Engine...
start "" %START_CMD%

:: Wait for port 3000 to be responsive before opening browser
set /a attempts=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 }" 2>nul
if %ERRORLEVEL% equ 0 goto OPEN_BROWSER

set /a attempts+=1
if %attempts% lss 30 goto WAIT_LOOP

:OPEN_BROWSER
echo [*] Opening BendLens Studio...
start "" http://127.0.0.1:3000
exit /b 0
