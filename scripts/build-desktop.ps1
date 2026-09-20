# ==============================================================================
# BendLens Ultra-Lightweight WebView2 Desktop Packager
# Compiles Next.js standalone and publishes single-file .NET 8 WebView2 executable
# ==============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   BendLens Ultra-Lightweight Desktop Packager (.NET 8)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $ProjectDir

# 1. Compile Next.js with standalone tracing
Write-Host "`n[*] Building Next.js engine with standalone output..." -ForegroundColor Yellow
$BuildStart = Get-Date
npm run build
Write-Host "[*] Next.js build completed in $([math]::Round(((Get-Date) - $BuildStart).TotalSeconds, 1))s." -ForegroundColor Green

# 2. Publish Single-File Native WebView2 Desktop Executable
$OutputDir = Join-Path $ProjectDir "dist\BendLens-WebView2"
if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Write-Host "`n[*] Publishing single-file native WebView2 executable..." -ForegroundColor Yellow
$PubStart = Get-Date
dotnet publish "$ProjectDir\desktop\BendLens.Desktop.csproj" `
    -c Release `
    -r win-x64 `
    --self-contained true `
    /p:PublishSingleFile=true `
    /p:EnableCompressionInSingleFile=true `
    -o $OutputDir

Write-Host "[*] Native binary published in $([math]::Round(((Get-Date) - $PubStart).TotalSeconds, 1))s." -ForegroundColor Green

# 3. Synchronize Next.js Standalone Assets for Offline Serving
Write-Host "`n[*] Synchronizing standalone web assets with robocopy..." -ForegroundColor Yellow
$StandaloneDir = Join-Path $ProjectDir ".next\standalone"

if (Test-Path $StandaloneDir) {
    & robocopy "$StandaloneDir" "$OutputDir" /E /SJ /SL /NDL /NFL /NJH /NJS /nc /ns /np
    if ($LASTEXITCODE -ge 8) {
        Write-Error "Robocopy standalone sync failed with exit code $LASTEXITCODE"
    }
}

# Standalone builds require .next/static and public/ to be copied next to server.js
$StaticSrc = Join-Path $ProjectDir ".next\static"
$StaticDest = Join-Path $OutputDir ".next\static"
if (Test-Path $StaticSrc) {
    & robocopy "$StaticSrc" "$StaticDest" /E /NDL /NFL /NJH /NJS /nc /ns /np
    if ($LASTEXITCODE -ge 8) {
        Write-Error "Robocopy static sync failed with exit code $LASTEXITCODE"
    }
}

$PublicSrc = Join-Path $ProjectDir "public"
$PublicDest = Join-Path $OutputDir "public"
if (Test-Path $PublicSrc) {
    & robocopy "$PublicSrc" "$PublicDest" /E /NDL /NFL /NJH /NJS /nc /ns /np
    if ($LASTEXITCODE -ge 8) {
        Write-Error "Robocopy public sync failed with exit code $LASTEXITCODE"
    }
}

# Clean up debug symbols (.pdb) from release distribution
Get-ChildItem -Path $OutputDir -Filter "*.pdb" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force

# 4. Display Final Verification & Size Metrics
$ExePath = Join-Path $OutputDir "BendLens.exe"
if (Test-Path $ExePath) {
    $ExeSizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 2)
    $TotalSizeMB = [math]::Round(((Get-ChildItem -Path $OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "   SUCCESS: BendLens Lightweight Desktop Build Complete!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "   Single-File Executable : $ExePath ($ExeSizeMB MB)" -ForegroundColor White
    Write-Host "   Total Bundle on Disk   : $TotalSizeMB MB (Down from 500+ MB Electron!)" -ForegroundColor Cyan
    Write-Host "========================================================`n" -ForegroundColor Green
} else {
    Write-Error "BendLens.exe was not found in output directory."
}
