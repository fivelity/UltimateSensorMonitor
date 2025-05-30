# Ultimate Sensor Monitor - Full Stack Launcher (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ultimate Sensor Monitor Full Stack Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will start both:" -ForegroundColor Yellow
Write-Host "  1. Backend Server (Admin + Conda)" -ForegroundColor Yellow
Write-Host "  2. Frontend Client (Regular)" -ForegroundColor Yellow
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Function to test if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to start backend server
function Start-BackendServer {
    Write-Host "🔧 Starting Backend Server..." -ForegroundColor Green
    
    if (Test-Administrator) {
        Write-Host "✓ Running with admin privileges" -ForegroundColor Green
        # Start backend in new window
        Start-Process cmd -ArgumentList "/c cd /d `"$PSScriptRoot\server`" && start_server_conda_admin.bat" -WindowStyle Normal
    } else {
        Write-Host "Requesting admin privileges for backend..." -ForegroundColor Yellow
        # Start backend with admin privileges in new window
        Start-Process cmd -ArgumentList "/c cd /d `"$PSScriptRoot\server`" && start_server_conda_admin.bat" -Verb RunAs -WindowStyle Normal
    }
    
    Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Function to start frontend client
function Start-FrontendClient {
    Write-Host "🌐 Starting Frontend Client..." -ForegroundColor Green
    
    Set-Location "$PSScriptRoot\client"
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Development servers starting..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backend: http://localhost:8100" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:5502" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the frontend server." -ForegroundColor Yellow
    Write-Host "Close the backend window to stop the backend." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Start frontend (this will keep the window open)
    npm run dev
}

# Function to open browser after delay
function Open-Browser {
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 10
        Start-Process "http://localhost:5502"
    } | Out-Null
}

# Main execution
try {
    Write-Host "Starting Ultimate Sensor Monitor..." -ForegroundColor Cyan
    
    # Start backend server
    Start-BackendServer
    
    # Schedule browser opening
    Open-Browser
    
    # Start frontend client (this will block until frontend is stopped)
    Start-FrontendClient
    
} catch {
    Write-Host "Error starting services: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
} finally {
    Write-Host ""
    Write-Host "Thanks for using Ultimate Sensor Monitor!" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
} 