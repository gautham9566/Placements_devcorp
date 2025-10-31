# Video Microservices - Stop Services Script
# This script stops all running microservices and closes their PowerShell windows

Write-Host "Stopping Video Microservices..." -ForegroundColor Yellow
Write-Host ""

# Service ports to check
$servicePorts = @(8001, 8002, 8003, 8004, 8005, 8006, 8007)
$servicesStopped = 0
$windowsClosed = 0

# Find and stop Python processes running on service ports
$pythonProcesses = Get-Process | Where-Object { $_.ProcessName -like "*python*" }

foreach ($process in $pythonProcesses) {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($cmdLine -and $cmdLine -like "*uvicorn*" -and ($cmdLine -like "*8001*" -or $cmdLine -like "*8002*" -or $cmdLine -like "*8003*" -or $cmdLine -like "*8004*" -or $cmdLine -like "*8005*" -or $cmdLine -like "*8006*" -or $cmdLine -like "*8007*")) {
            Write-Host "Stopping service process (PID: $($process.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
            $servicesStopped++
        }
    } catch {
        Write-Host "Could not stop process $($process.Id): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Find and close PowerShell windows running the services
$powershellProcesses = Get-Process | Where-Object { $_.ProcessName -eq "powershell" }

foreach ($process in $powershellProcesses) {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($cmdLine -and $cmdLine -like "*uvicorn*" -and ($cmdLine -like "*8001*" -or $cmdLine -like "*8002*" -or $cmdLine -like "*8003*" -or $cmdLine -like "*8004*" -or $cmdLine -like "*8005*" -or $cmdLine -like "*8006*" -or $cmdLine -like "*8007*")) {
            Write-Host "Closing PowerShell window (PID: $($process.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
            $windowsClosed++
        }
    } catch {
        Write-Host "Could not close PowerShell window $($process.Id): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Alternative: Kill all Python processes (use with caution)
# Write-Host "Stopping all Python processes..." -ForegroundColor Yellow
# Stop-Process -Name python -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($servicesStopped -gt 0) {
    Write-Host "Successfully stopped $servicesStopped service(s)." -ForegroundColor Green
} else {
    Write-Host "No running services found." -ForegroundColor Yellow
}

if ($windowsClosed -gt 0) {
    Write-Host "Successfully closed $windowsClosed PowerShell window(s)." -ForegroundColor Green
} else {
    Write-Host "No service PowerShell windows found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All services stopped and windows closed!" -ForegroundColor Green