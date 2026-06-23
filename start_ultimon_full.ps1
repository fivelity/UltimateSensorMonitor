# Ultimate Sensor Monitor - Full Stack Launcher (PowerShell)
#
# Starts both the FastAPI backend (elevated, for hardware sensor access) and
# the SvelteKit frontend dev server. Uses the project's root .venv for the
# backend Python interpreter.
#
# Usage:
#   .\start_ultimon_full.ps1
#   .\start_ultimon_full.ps1 -NoBrowser   # skip auto-opening the browser

param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

# --- Configuration ---------------------------------------------------------
$BackendPort = 8100
$FrontendPort = 5501
# ---------------------------------------------------------------------------

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

function Start-BackendServer {
  Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Green

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

  # Kill any existing process on the backend port to avoid zombie processes
  # from previous runs (especially with --reload).
  $existingConns = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
  if ($existingConns) {
    foreach ($conn in $existingConns) {
      $procId = $conn.OwningProcess
      if ($procId -and $procId -ne $PID) {
        Write-Host "  Killing existing process on port $BackendPort (PID: $procId)..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      }
    }
  }

  # Hardware sensors (LibreHardwareMonitor) require admin privileges.
  # Launch the backend in an elevated window so the frontend can keep running
  # in this (non-elevated) terminal.
  $cmd = "`"$venvPython`" -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort --reload"

  if (Test-Administrator) {
    Write-Host "  Already elevated; starting backend in new window..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -WindowStyle Normal
  }
  else {
    Write-Host "  Requesting admin privileges for hardware sensor access..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -Verb RunAs -WindowStyle Normal
  }

  Write-Host "  Waiting for backend to initialize..." -ForegroundColor Yellow
  $maxWait = 30
  $waited = 0
  $backendReady = $false
  while ($waited -lt $maxWait) {
    try {
      $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($response.StatusCode -eq 200) {
        $backendReady = $true
        Write-Host "  Backend is ready (after ${waited}s)!" -ForegroundColor Green
        break
      }
    }
    catch {
      Start-Sleep -Seconds 1
      $waited++
    }
  }
  if (-not $backendReady) {
    Write-Host "  Backend not ready after ${maxWait}s, starting frontend anyway..." -ForegroundColor Yellow
  }
}

function Start-FrontendClient {
  Write-Host "[2/2] Starting Frontend Client..." -ForegroundColor Green

  $clientDir = Join-Path $PSScriptRoot "client"
  if (-not (Test-Path $clientDir)) {
    Write-Host "Error: client directory not found at $clientDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }
  Set-Location $clientDir

  if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
  }

  Write-Header "Development servers starting..."
  Write-Host "  Backend:   http://localhost:$BackendPort" -ForegroundColor Green
  Write-Host "  Frontend:  http://localhost:$FrontendPort" -ForegroundColor Green
  Write-Host "  API docs:  http://localhost:$BackendPort/docs" -ForegroundColor Green
  Write-Host ""
  Write-Host "Press Ctrl+C to stop the frontend." -ForegroundColor Yellow
  Write-Host "Close the backend window to stop the backend." -ForegroundColor Yellow
  Write-Host "================================================================" -ForegroundColor Cyan
  Write-Host ""

  # This blocks until the frontend is stopped.
  npm run dev
}

function Open-Browser {
  Start-Job -ScriptBlock {
    param($url)
    Start-Sleep -Seconds 10
    Start-Process $url
  } -ArgumentList "http://localhost:$FrontendPort" | Out-Null
}

# --- Main ------------------------------------------------------------------
try {
  Write-Header "Ultimate Sensor Monitor - Full Stack Launcher"
  Write-Host "Starting backend (elevated) and frontend..." -ForegroundColor Yellow
  Write-Host ""

  Start-BackendServer
  if (-not $NoBrowser) { Open-Browser }
  Start-FrontendClient
}
catch {
  Write-Host ""
  Write-Host "Error starting services: $_" -ForegroundColor Red
  Read-Host "Press Enter to exit"
}
finally {
  Write-Host ""
  Write-Host "Thanks for using Ultimate Sensor Monitor!" -ForegroundColor Cyan
}
