@echo off
title BendLens - Universal Backend Architecture Platform
echo ========================================================
echo   Starting BendLens Desktop Studio (100%% Private)
echo ========================================================
echo.

:: Automatically resolve current directory regardless of user path
cd /d "%~dp0"

echo [*] Current Directory: %~dp0

:: Automatically create/update a Desktop shortcut with the official BendLens Icon
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'BendLens.lnk')); $s.TargetPath = '%~dp0BendLens.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0public\icon.ico'; $s.Description = 'BendLens - Universal Backend Architecture & Blast Platform'; $s.Save()" 2>nul

IF NOT EXIST "node_modules" (
    echo [1/3] Installing local dependencies (first-time only)...
    call npm install
)

echo [2/3] Starting BendLens Local Engine...
start "" http://localhost:3000

echo [3/3] Opening Web Console on http://localhost:3000 ...
npm run dev

pause
