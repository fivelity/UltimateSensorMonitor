# Ultimate Sensor Monitor - Backend Launcher (PowerShell)
#
# Starts only the FastAPI backend (elevated, for hardware sensor access).
# Useful for debugging the backend independently of the frontend.
#
# Usage:
#   .\start_ultimon_backend.ps1
#   .\start_ultimon_backend.ps1 -Port 8200

param(
  [int]$Port = 8100
)

$ErrorActionPreference = "Stop"

function Write-Header($text) {
  Write-Host "================================================================" -ForegroundColor Cyan
  Write-Host $text -ForegroundColor Cyan
  Write-Host "================================================================" -ForegroundColor Cyan
  Write-Host ""
}

function Test-Administrator {
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-VenvPython {
  # Locate the Python executable in the project virtual environment.
  # Search order: <root>\.venv, <root>\server\.venv, <root>\server\venv
  $root = $PSScriptRoot
  $candidates = @(
    (Join-Path $root ".venv\Scripts\python.exe"),
    (Join-Path $root "server\.venv\Scripts\python.exe"),
    (Join-Path $root "server\venv\Scripts\python.exe")
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Stop-ExistingProcessOnPort {
  param([int]$Port)
  $existingConns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($existingConns) {
    foreach ($conn in $existingConns) {
      $procId = $conn.OwningProcess
      if ($procId -and $procId -ne $PID) {
        Write-Host "  Killing existing process on port $Port (PID: $procId)..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

function Start-BackendServer {
  Write-Host "Starting Backend Server on port $Port..." -ForegroundColor Green

  $serverDir = Join-Path $PSScriptRoot "server"
  if (-not (Test-Path $serverDir)) {
    Write-Host "Error: server directory not found at $serverDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }

  $venvPython = Get-VenvPython
  if ($venvPython) {
    Write-Host "  Using virtual environment Python: $venvPython" -ForegroundColor Yellow
  }
  else {
    Write-Host "  No .venv found, using system Python" -ForegroundColor Yellow
    $venvPython = "python"
  }

  # Kill any existing process on the backend port to avoid zombie processes.
  Stop-ExistingProcessOnPort -Port $Port

  # Hardware sensors (LibreHardwareMonitor) require admin privileges.
  $cmd = "`"$venvPython`" -m uvicorn app.main:app --host 0.0.0.0 --port $Port"

  if (Test-Administrator) {
    Write-Host "  Already elevated; starting backend in new window..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -WindowStyle Normal
  }
  else {
    Write-Host "  Requesting admin privileges for hardware sensor access..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -Verb RunAs -WindowStyle Normal
  }

  Write-Host "  Backend window launched." -ForegroundColor Green
}

function Wait-BackendReady {
  param([int]$TimeoutSeconds = 30)
  Write-Host "  Waiting for backend health check..." -ForegroundColor Yellow
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
      if ($response.StatusCode -eq 200) {
        Write-Host "  Backend is ready (after $([int]$sw.Elapsed.TotalSeconds)s)!" -ForegroundColor Green
        return $true
      }
    }
    catch {
      Start-Sleep -Milliseconds 500
    }
  }
  Write-Host "  Backend not ready after ${TimeoutSeconds}s." -ForegroundColor Yellow
  return $false
}

# --- Main ------------------------------------------------------------------
try {
  Write-Header "Ultimate Sensor Monitor - Backend Launcher"
  Write-Host "Backend will be available at: http://localhost:$Port" -ForegroundColor Green
  Write-Host "API docs: http://localhost:$Port/docs" -ForegroundColor Green
  Write-Host ""

  Start-BackendServer
  $ready = Wait-BackendReady

  if (-not $ready) {
    Write-Host ""
    Write-Host "Backend did not respond to health checks. Check the backend window for errors." -ForegroundColor Red
    Read-Host "Press Enter to exit"
  }
}
catch {
  Write-Host ""
  Write-Host "Error starting backend: $_" -ForegroundColor Red
  Read-Host "Press Enter to exit"
}
finally {
  Write-Host ""
  Write-Host "Thanks for using Ultimate Sensor Monitor!" -ForegroundColor Cyan
}
