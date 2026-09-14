@echo off
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
if exist "%LOCALAPPDATA%\BendLens" rmdir /s /q "%LOCALAPPDATA%\BendLens"
if exist "%LOCALAPPDATA%\Programs\BendLens" rmdir /s /q "%LOCALAPPDATA%\Programs\BendLens"

echo [*] Removing all related BendLens application data...
if exist "%APPDATA%\BendLens" rmdir /s /q "%APPDATA%\BendLens"
if exist "%APPDATA%\com.bendlens.studio" rmdir /s /q "%APPDATA%\com.bendlens.studio"
if exist "%TEMP%\.bendlens_history.json" del /f /q "%TEMP%\.bendlens_history.json"

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
