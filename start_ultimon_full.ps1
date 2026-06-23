# Ultimate Sensor Monitor - Full Stack Launcher (PowerShell)
#
# Starts both the FastAPI backend (elevated, for hardware sensor access) and
# the SvelteKit frontend dev server in parallel. Uses the project's root .venv
# for the backend Python interpreter.
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

# How long to keep polling a service before giving up (seconds).
$BackendHealthTimeout = 30
$FrontendReadyTimeout = 60

# Polling interval when a service is not yet ready (milliseconds).
$PollIntervalMs = 500
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

  # Hardware sensors (LibreHardwareMonitor) require admin privileges.
  # Launch the backend in an elevated window so the frontend can keep running
  # in this (non-elevated) terminal.
  $cmd = "`"$venvPython`" -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort"

  if (Test-Administrator) {
    Write-Host "  Already elevated; starting backend in new window..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -WindowStyle Normal
  }
  else {
    Write-Host "  Requesting admin privileges for hardware sensor access..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k cd /d `"$serverDir`" && $cmd" -Verb RunAs -WindowStyle Normal
  }

  Write-Host "  Backend window launched; continuing with frontend startup..." -ForegroundColor Green
}

function Start-BackendHealthMonitor {
  # Monitor the backend in a background job so it doesn't block the frontend.
  # The job reports the elapsed seconds when received, or -1 on timeout.
  return Start-Job -ScriptBlock {
    param($Port, $TimeoutSeconds, $IntervalMs)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
      try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
          return [int]$sw.Elapsed.TotalSeconds
        }
      }
      catch {
        Start-Sleep -Milliseconds $IntervalMs
      }
    }
    return -1
  } -ArgumentList $BackendPort, $BackendHealthTimeout, $PollIntervalMs
}

function Start-FrontendBrowserWatcher {
  # Open the browser as soon as the frontend Vite dev server responds.
  return Start-Job -ScriptBlock {
    param($Port, $Url, $TimeoutSeconds, $IntervalMs)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
      try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
          Start-Process $Url
          return [int]$sw.Elapsed.TotalSeconds
        }
      }
      catch {
        Start-Sleep -Milliseconds $IntervalMs
      }
    }
    return -1
  } -ArgumentList $FrontendPort, "http://localhost:$FrontendPort", $FrontendReadyTimeout, $PollIntervalMs
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

  # Start the browser watcher in the background so it doesn't block the dev server.
  $browserJob = $null
  if (-not $NoBrowser) {
    $browserJob = Start-FrontendBrowserWatcher
  }

  # This blocks until the frontend is stopped.
  npm run dev

  # Clean up the browser watcher if it's still running.
  if ($browserJob) {
    Stop-Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job $browserJob -ErrorAction SilentlyContinue
  }
}

# --- Main ------------------------------------------------------------------
try {
  Write-Header "Ultimate Sensor Monitor - Full Stack Launcher"

  # Clean up any leftover processes from previous runs so we don't end up with
  # zombie backends/frontends or port conflicts.
  Write-Host "Cleaning up leftover processes..." -ForegroundColor Yellow
  Stop-ExistingProcessOnPort -Port $BackendPort
  Stop-ExistingProcessOnPort -Port $FrontendPort
  Write-Host ""

  Write-Host "Starting backend (elevated) and frontend in parallel..." -ForegroundColor Yellow
  Write-Host ""

  Start-BackendServer

  # Monitor backend health in the background while the frontend launches.
  $backendHealthJob = Start-BackendHealthMonitor

  Start-FrontendClient

  # Retrieve the backend health monitor result and report it.
  $backendElapsed = Receive-Job $backendHealthJob -Wait -AutoRemoveJob
  if ($backendElapsed -ge 0) {
    Write-Host "  Backend became ready after ${backendElapsed}s." -ForegroundColor Green
  }
  else {
    Write-Host "  Backend was not ready after ${BackendHealthTimeout}s." -ForegroundColor Yellow
  }
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
