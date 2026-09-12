param(
    [string]$PngPath = "public\icon.png",
    [string]$IcoPath = "public\icon.ico"
)

Add-Type -AssemblyName System.Drawing

$fullPng = [System.IO.Path]::GetFullPath($PngPath)
$fullIco = [System.IO.Path]::GetFullPath($IcoPath)

if (-not (Test-Path $fullPng)) {
    Write-Error "PNG file not found: $fullPng"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($fullPng)
$size = 256
$targetBmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($targetBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($srcBmp, 0, 0, $size, $size)

$hIcon = $targetBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $fullIco, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$g.Dispose()
$targetBmp.Dispose()
$srcBmp.Dispose()

Write-Host "[OK] Successfully converted $fullPng to $fullIco"
