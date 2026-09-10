@echo off
title BendLens Studio - Universal Backend Architecture & Blast Platform
echo ========================================================
echo   Starting BendLens Studio (100%% Local & Private)
echo ========================================================

cd /d "%~dp0"

:: 1. If Electron Native Desktop runtime is available, launch immediately
if exist "node_modules\electron\dist\electron.exe" (
    echo [*] Launching Native Desktop Studio...
    start "" "node_modules\electron\dist\electron.exe" "."
    exit /b 0
)

:: 2. Ensure dependencies exist
if not exist "node_modules" (
    echo [*] Installing dependencies for first-time run...
    call npm install
)

:: 3. Web Mode Fallback:
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
echo [*] Launching Web Console on http://127.0.0.1:3000 ...
start "" http://127.0.0.1:3000
exit /b 0
