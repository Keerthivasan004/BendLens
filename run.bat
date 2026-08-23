@echo off
title BendLens - Universal Backend Architecture & Blast Platform
echo ========================================================
echo   Starting BendLens Studio (100%% Local & Private)
echo ========================================================
echo.

cd /d "%~dp0"

IF EXIST ".git" (
    echo [*] Checking for BendLens engine updates...
    git pull origin main --quiet
)

IF NOT EXIST "node_modules" (
    echo [1/3] Installing dependencies for first-time run...
    call npm install
)

echo [2/3] Starting BendLens Local Engine...
start "" http://localhost:3000

echo [3/3] Launching web console on http://localhost:3000 ...
npm run dev

pause
