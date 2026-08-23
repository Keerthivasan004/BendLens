Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $projectRoot) { $projectRoot = Get-Location }

$publicDir = Join-Path $projectRoot "public"
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir -Force }

$size = 128
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

# Dark Tech Background Rounded Rectangle
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 9, 12, 20))
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 56, 189, 248)), 3

# Draw Outer Circle Base
$g.FillEllipse($bgBrush, 6, 6, 116, 116)
$g.DrawEllipse($borderPen, 6, 6, 116, 116)

# Database Cylinders / Disks
$diskBrush1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 99, 102, 241)) # Indigo (Bottom)
$diskBrush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 59, 130, 246)) # Blue (Middle)
$diskBrush3 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 56, 189, 248)) # Sky/Cyan (Top)

# Bottom Cylinder
$g.FillRectangle($diskBrush1, 38, 72, 52, 14)
$g.FillEllipse($diskBrush1, 38, 79, 52, 16)
$g.FillEllipse($diskBrush2, 38, 66, 52, 16)

# Middle Cylinder
$g.FillRectangle($diskBrush2, 38, 52, 52, 14)
$g.FillEllipse($diskBrush2, 38, 59, 52, 16)
$g.FillEllipse($diskBrush3, 38, 46, 52, 16)

# Top Cylinder
$g.FillRectangle($diskBrush3, 38, 32, 52, 14)
$g.FillEllipse($diskBrush3, 38, 39, 52, 16)
$diskTopBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 224, 242, 254))
$g.FillEllipse($diskTopBrush, 38, 26, 52, 16)

# Neural Node Points
$nodeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$nodePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 56, 189, 248)), 1.5

$g.FillEllipse($nodeBrush, 18, 34, 10, 10)
$g.DrawEllipse($nodePen, 18, 34, 10, 10)

$g.FillEllipse($nodeBrush, 100, 34, 10, 10)
$g.DrawEllipse($nodePen, 100, 34, 10, 10)

$g.FillEllipse($nodeBrush, 18, 84, 10, 10)
$g.DrawEllipse($nodePen, 18, 84, 10, 10)

$g.FillEllipse($nodeBrush, 100, 84, 10, 10)
$g.DrawEllipse($nodePen, 100, 84, 10, 10)

# Neural Connection Lines
$linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 56, 189, 248)), 2
$linePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawLine($linePen, 28, 39, 38, 34)
$g.DrawLine($linePen, 100, 39, 90, 34)
$g.DrawLine($linePen, 28, 89, 38, 86)
$g.DrawLine($linePen, 100, 89, 90, 86)

# Outer Rotating Ring Lens
$ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 192, 132, 252)), 3
$ringPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawEllipse($ringPen, 18, 18, 92, 92)

# Save PNG
$pngPath = Join-Path $publicDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Save ICO
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $publicDir "icon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

# Copy to root and downloads
Copy-Item $icoPath (Join-Path $projectRoot "icon.ico") -Force
Copy-Item $pngPath (Join-Path $projectRoot "icon.png") -Force

$downloadsDir = Join-Path $publicDir "downloads"
if (-not (Test-Path $downloadsDir)) { New-Item -ItemType Directory -Path $downloadsDir -Force }
Copy-Item $icoPath (Join-Path $downloadsDir "icon.ico") -Force

$g.Dispose()
$bmp.Dispose()
Write-Host "[OK] BendLens Official icon.ico and icon.png generated successfully at $icoPath"
