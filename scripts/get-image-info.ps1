$img = [System.Drawing.Image]::FromFile('C:\Users\DanDan\22.png')
Write-Output "Width: $($img.Width)"
Write-Output "Height: $($img.Height)"
Write-Output "PixelFormat: $($img.PixelFormat)"
$img.Dispose()
