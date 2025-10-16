# Install Dependencies for All Microservices
# Run this script from the microservices directory

Write-Host "Installing dependencies for all microservices..." -ForegroundColor Cyan
Write-Host ""

$services = @(
    "upload_service",
    "metadata_service",
    "transcoding_service",
    "streaming_service",
    "admin_service"
)

$allDependencies = @(
    "fastapi==0.104.1",
    "uvicorn==0.24.0",
    "python-multipart==0.0.6",
    "requests==2.31.0",
    "sqlalchemy==2.0.23"
)

Write-Host "Installing common dependencies..." -ForegroundColor Yellow
pip install $allDependencies

Write-Host ""
Write-Host "Verifying installations..." -ForegroundColor Yellow

foreach ($service in $services) {
    if (Test-Path $service) {
        Write-Host "✓ $service found" -ForegroundColor Green
    } else {
        Write-Host "✗ $service NOT found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Checking FFmpeg installation..." -ForegroundColor Yellow

try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Host "✓ FFmpeg installed: $ffmpegVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ FFmpeg NOT found in PATH" -ForegroundColor Red
    Write-Host "  Please install FFmpeg from https://ffmpeg.org/download.html" -ForegroundColor Yellow
}

try {
    $ffprobeVersion = ffprobe -version 2>&1 | Select-Object -First 1
    Write-Host "✓ FFprobe installed: $ffprobeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ FFprobe NOT found in PATH" -ForegroundColor Red
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Run './start_all_services.ps1' to start all services" -ForegroundColor Cyan
