# Video Microservices - PowerShell Startup Script
# This script starts all microservices in separate PowerShell windows

Write-Host "Starting Video Microservices..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Service configuration
$services = @(
    @{Name="Metadata Service"; Port=8003; Dir="metadata_service"},
    @{Name="Upload Service"; Port=8001; Dir="upload_service"},
    @{Name="Transcoding Service"; Port=8002; Dir="transcoding_service"},
    @{Name="Streaming Service"; Port=8004; Dir="streaming_service"},
    @{Name="Admin Service"; Port=8005; Dir="admin_service"},
    @{Name="Course Service"; Port=8006; Dir="course_service"}
)

# Start each service in a new PowerShell window
foreach ($service in $services) {
    $servicePath = Join-Path $scriptDir $service.Dir
    $command = "cd '$servicePath'; Write-Host 'Starting $($service.Name) on port $($service.Port)...' -ForegroundColor Cyan; python -m uvicorn main:app --host 0.0.0.0 --port $($service.Port)"
    
    Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Yellow
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  - Upload Service:      http://localhost:8001" -ForegroundColor White
Write-Host "  - Transcoding Service: http://localhost:8002" -ForegroundColor White
Write-Host "  - Metadata Service:    http://localhost:8003" -ForegroundColor White
Write-Host "  - Streaming Service:   http://localhost:8004" -ForegroundColor White
Write-Host "  - Admin Service:       http://localhost:8005" -ForegroundColor White
Write-Host "  - Course Service:      http://localhost:8006" -ForegroundColor White
Write-Host ""
Write-Host "API Documentation (Swagger UI):" -ForegroundColor Cyan
Write-Host "  - Upload Service:      http://localhost:8001/docs" -ForegroundColor White
Write-Host "  - Transcoding Service: http://localhost:8002/docs" -ForegroundColor White
Write-Host "  - Metadata Service:    http://localhost:8003/docs" -ForegroundColor White
Write-Host "  - Streaming Service:   http://localhost:8004/docs" -ForegroundColor White
Write-Host "  - Admin Service:       http://localhost:8005/docs" -ForegroundColor White
Write-Host "  - Course Service:      http://localhost:8006/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit (services will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
