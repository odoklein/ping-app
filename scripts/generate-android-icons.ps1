Add-Type -AssemblyName System.Drawing

$SourcePath = "public\favicon.png"
if (-not (Test-Path $SourcePath)) {
    $SourcePath = "public\brand\ping-logo-blue.png"
}

$sourceBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourcePath).Path)

$mipmapConfigs = @(
    @{ Name = "mipmap-mdpi"; Size = 48; FgSize = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; FgSize = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; FgSize = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; FgSize = 432 }
)

function Create-ResizedImage($source, $targetWidth, $targetHeight, $isForeground = $false) {
    $dest = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if (-not $isForeground) {
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($brush, 0, 0, $targetWidth, $targetHeight)
    }

    # Maintain aspect ratio with padding
    $scale = [Math]::Min(($targetWidth * 0.75) / $source.Width, ($targetHeight * 0.75) / $source.Height)
    $newW = [int]($source.Width * $scale)
    $newH = [int]($source.Height * $scale)
    $posX = [int](($targetWidth - $newW) / 2)
    $posY = [int](($targetHeight - $newH) / 2)

    $g.DrawImage($source, $posX, $posY, $newW, $newH)
    $g.Dispose()
    return $dest
}

foreach ($cfg in $mipmapConfigs) {
    $dir = "android\app\src\main\res\" + $cfg.Name
    if (Test-Path $dir) {
        # 1. ic_launcher.png
        $icon = Create-ResizedImage $sourceBmp $cfg.Size $cfg.Size $false
        $icon.Save("$dir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $icon.Save("$dir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $icon.Dispose()

        # 2. ic_launcher_foreground.png
        $fg = Create-ResizedImage $sourceBmp $cfg.FgSize $cfg.FgSize $true
        $fg.Save("$dir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $fg.Dispose()

        Write-Host "Updated icons for $($cfg.Name)"
    }
}

$sourceBmp.Dispose()
Write-Host "All Android icons generated successfully!" -ForegroundColor Green
