# Ultimate Sensor Monitor - Backend Server Launcher
# PowerShell version

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "           Ultimate Sensor Monitor - Backend Server" -ForegroundColor Cyan  
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "server")) {
    Write-Host "Error: server directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the UltimateSensorMonitor root directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] Changing to server directory..." -ForegroundColor Green
Set-Location server

Write-Host "[2/3] Checking Python environment..." -ForegroundColor Green
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Found virtual environment, activating..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
} elseif (Test-Path "venv\Scripts\activate.bat") {
    Write-Host "Found virtual environment (batch), activating..." -ForegroundColor Yellow
    & "venv\Scripts\activate.bat"
} else {
    Write-Host "Warning: Virtual environment not found, using system Python" -ForegroundColor Yellow
}

Write-Host "[3/3] Starting backend server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server starting on: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8100" -ForegroundColor Cyan
Write-Host "API Documentation: " -NoNewline -ForegroundColor White  
Write-Host "http://localhost:8100/docs" -ForegroundColor Cyan
Write-Host "WebSocket endpoint: " -NoNewline -ForegroundColor White
Write-Host "ws://localhost:8100/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Run the server
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
}
catch {
    Write-Host ""
    Write-Host "Error starting server: $_" -ForegroundColor Red
}
finally {
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
} 