Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$brand = @{
    Midnight = [System.Drawing.ColorTranslator]::FromHtml('#081A2B')
    Navy = [System.Drawing.ColorTranslator]::FromHtml('#0F2C46')
    Ink = [System.Drawing.ColorTranslator]::FromHtml('#153757')
    Glow = [System.Drawing.ColorTranslator]::FromHtml('#244E79')
    Mist = [System.Drawing.ColorTranslator]::FromHtml('#D8E4F1')
    Gold = [System.Drawing.ColorTranslator]::FromHtml('#D3A34D')
    White = [System.Drawing.Color]::White
}

function New-GraphicsPathRoundedRect([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Set-CanvasQuality($graphics) {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function Draw-AleSymbol($graphics, [float]$originX, [float]$originY, [float]$size) {
    $sx = $size / 1024.0
    $sy = $size / 1024.0
    $goldBrush = New-Object System.Drawing.SolidBrush($brand.Gold)
    $whiteBrush = New-Object System.Drawing.SolidBrush($brand.White)
    $mistBrush = New-Object System.Drawing.SolidBrush($brand.Mist)

    $diamond = @(
        ([System.Drawing.PointF]::new(($originX + (512 * $sx)), ($originY + (132 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (606 * $sx)), ($originY + (226 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (512 * $sx)), ($originY + (320 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (418 * $sx)), ($originY + (226 * $sy))))
    )
    $graphics.FillPolygon($goldBrush, $diamond)

    $left = @(
        ([System.Drawing.PointF]::new(($originX + (215 * $sx)), ($originY + (812 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (360 * $sx)), ($originY + (289 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (445 * $sx)), ($originY + (289 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (340 * $sx)), ($originY + (812 * $sy))))
    )
    $right = @(
        ([System.Drawing.PointF]::new(($originX + (809 * $sx)), ($originY + (812 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (664 * $sx)), ($originY + (289 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (579 * $sx)), ($originY + (289 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (684 * $sx)), ($originY + (812 * $sy))))
    )
    $base = @(
        ([System.Drawing.PointF]::new(($originX + (381 * $sx)), ($originY + (812 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (643 * $sx)), ($originY + (812 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (586 * $sx)), ($originY + (894 * $sy)))),
        ([System.Drawing.PointF]::new(($originX + (438 * $sx)), ($originY + (894 * $sy))))
    )

    $graphics.FillPolygon($whiteBrush, $left)
    $graphics.FillPolygon($mistBrush, $right)
    $graphics.FillRectangle($goldBrush, $originX + (474 * $sx), $originY + (338 * $sy), 76 * $sx, 474 * $sy)
    $graphics.FillPolygon($mistBrush, $base)

    $goldBrush.Dispose()
    $whiteBrush.Dispose()
    $mistBrush.Dispose()
}

function Save-Png($bitmap, [string]$path) {
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-LauncherIcon([string]$path, [int]$size, [bool]$round) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    Set-CanvasQuality $graphics
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($round) {
        $bgBrush = New-Object System.Drawing.SolidBrush($brand.Navy)
        $graphics.FillEllipse($bgBrush, 0, 0, $size, $size)
        $bgBrush.Dispose()
    } else {
        $pathBg = New-GraphicsPathRoundedRect 0 0 $size $size ($size * 0.22)
        $bgBrush = New-Object System.Drawing.SolidBrush($brand.Navy)
        $graphics.FillPath($bgBrush, $pathBg)
        $bgBrush.Dispose()
        $pathBg.Dispose()
    }

    $padding = if ($round) { [math]::Round($size * 0.11) } else { [math]::Round($size * 0.08) }
    $symbolSize = $size - ($padding * 2)
    Draw-AleSymbol $graphics $padding $padding $symbolSize

    Save-Png $bitmap $path
    $graphics.Dispose()
    $bitmap.Dispose()
}

function New-IconPreview([string]$path) {
    New-LauncherIcon -path $path -size 1024 -round:$false
}

function New-SplashPreview([string]$path) {
    $width = 1600
    $height = 2560
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    Set-CanvasQuality $graphics

    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $brand.Midnight, $brand.Navy, 90)
    $graphics.FillRectangle($gradient, $rect)
    $gradient.Dispose()

    $glow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, $brand.Ink))
    $graphics.FillEllipse($glow1, 740, 120, 840, 840)
    $glow1.Dispose()

    $glow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, $brand.Glow))
    $graphics.FillEllipse($glow2, 410, 670, 780, 780)
    $glow2.Dispose()

    $plateBrush = New-Object System.Drawing.SolidBrush($brand.Ink)
    $graphics.FillEllipse($plateBrush, 500, 760, 600, 600)
    $plateBrush.Dispose()

    Draw-AleSymbol $graphics 380 640 840

    $barBrush = New-Object System.Drawing.SolidBrush($brand.Gold)
    $graphics.FillRectangle($barBrush, 636, 1576, 328, 10)
    $barBrush.Dispose()

    $panelPath = New-GraphicsPathRoundedRect 402 1748 796 250 48
    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(185, $brand.Navy))
    $graphics.FillPath($panelBrush, $panelPath)
    $panelBrush.Dispose()
    $panelPath.Dispose()

    $titleFont = New-Object System.Drawing.Font('Georgia', 62, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $subtitleFont = New-Object System.Drawing.Font('Segoe UI Semibold', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $taglineFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $center = New-Object System.Drawing.StringFormat
    $center.Alignment = [System.Drawing.StringAlignment]::Center
    $center.LineAlignment = [System.Drawing.StringAlignment]::Center

    $whiteBrush = New-Object System.Drawing.SolidBrush($brand.White)
    $mistBrush = New-Object System.Drawing.SolidBrush($brand.Mist)
    $goldBrush = New-Object System.Drawing.SolidBrush($brand.Gold)

    $graphics.DrawString('ALE00Y1', $titleFont, $whiteBrush, ([System.Drawing.RectangleF]::new(360, 1794, 880, 76)), $center)
    $graphics.DrawString('ACADEMIC LITERACIES', $subtitleFont, $mistBrush, ([System.Drawing.RectangleF]::new(360, 1888, 880, 40)), $center)
    $graphics.DrawString('READ  •  WRITE  •  THINK', $taglineFont, $goldBrush, ([System.Drawing.RectangleF]::new(360, 1970, 880, 34)), $center)

    $titleFont.Dispose()
    $subtitleFont.Dispose()
    $taglineFont.Dispose()
    $center.Dispose()
    $whiteBrush.Dispose()
    $mistBrush.Dispose()
    $goldBrush.Dispose()

    Save-Png $bitmap $path
    $graphics.Dispose()
    $bitmap.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconSizes = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}

foreach ($entry in $iconSizes.GetEnumerator()) {
    New-LauncherIcon -path (Join-Path $root "android\app\src\main\res\$($entry.Key)\ic_launcher.png") -size $entry.Value -round:$false
    New-LauncherIcon -path (Join-Path $root "android\app\src\main\res\$($entry.Key)\ic_launcher_round.png") -size $entry.Value -round:$true
}

New-IconPreview -path (Join-Path $PSScriptRoot 'ale00y1-icon-preview.png')
New-SplashPreview -path (Join-Path $PSScriptRoot 'ale00y1-splash-preview.png')
