# ==============================================================================
# BendLens Ultra-Lightweight WebView2 Desktop Packager (.NET 8 + Standalone)
# ==============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   BendLens Ultra-Lightweight Desktop Packager (.NET 8)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $ProjectDir

# 1. Compile Next.js with standalone tracing
Write-Host "`n[*] Step 1/3: Building Next.js engine with standalone output..." -ForegroundColor Yellow
$BuildStart = Get-Date
npm run build
Write-Host "[*] Next.js build completed in $([math]::Round(((Get-Date) - $BuildStart).TotalSeconds, 1))s." -ForegroundColor Green

$StandaloneDir = Join-Path $ProjectDir ".next\standalone"

# Purge any inadvertently traced dev folders (.git, dist, desktop)
Remove-Item "$StandaloneDir\.git", "$StandaloneDir\dist", "$StandaloneDir\desktop" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Synchronize Next.js static assets into standalone
Write-Host "`n[*] Step 2/3: Synchronizing Next.js static web assets..." -ForegroundColor Yellow
$StaticSrc = Join-Path $ProjectDir ".next\static"
$StaticDest = Join-Path $StandaloneDir ".next\static"
if (Test-Path $StaticSrc) {
    & robocopy "$StaticSrc" "$StaticDest" /E /R:1 /W:1 /NDL /NFL /NJH /NJS | Out-Null
}

# 3. Publish Single-File Native WebView2 Executable directly into standalone
Write-Host "`n[*] Step 3/3: Publishing single-file native WebView2 executable..." -ForegroundColor Yellow
$PubStart = Get-Date
dotnet publish "$ProjectDir\desktop\BendLens.Desktop.csproj" `
    -c Release `
    -r win-x64 `
    --self-contained true `
    /p:PublishSingleFile=true `
    /p:EnableCompressionInSingleFile=true `
    -o "$StandaloneDir"

Write-Host "[*] Native binary published in $([math]::Round(((Get-Date) - $PubStart).TotalSeconds, 1))s." -ForegroundColor Green

# 4. Display Final Verification & Size Metrics
$ExePath = Join-Path $StandaloneDir "BendLens.exe"
if (Test-Path $ExePath) {
    $ExeSizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 2)
    $TotalSizeMB = [math]::Round(((Get-ChildItem -Path $StandaloneDir -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "   SUCCESS: BendLens Lightweight Desktop Build Complete!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "   Location               : $StandaloneDir" -ForegroundColor White
    Write-Host "   Single-File Executable : BendLens.exe ($ExeSizeMB MB)" -ForegroundColor Yellow
    Write-Host "   Total Bundle on Disk   : $TotalSizeMB MB (Down from 500+ MB Electron!)" -ForegroundColor Cyan
    Write-Host "========================================================`n" -ForegroundColor Green
} else {
    Write-Error "BendLens.exe was not found in standalone directory."
}
