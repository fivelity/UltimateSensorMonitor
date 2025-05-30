#!/usr/bin/env powershell

Write-Host "Setting up Ultimate Sensor Monitor Backend Environment for Windows..." -ForegroundColor Green
Write-Host ""

# Check if conda is available
try {
    $condaVersion = conda --version 2>$null
    Write-Host "Found conda installation: $condaVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Conda is not available in PATH." -ForegroundColor Red
    Write-Host "Please make sure Miniconda or Anaconda is installed and added to PATH." -ForegroundColor Yellow
    Write-Host "You can download Miniconda from: https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Remove existing environment if it exists
Write-Host "Removing existing environment (if any)..." -ForegroundColor Yellow
conda env remove -n ultimon-backend -y

# Create new environment from yml file
Write-Host "Creating new conda environment from environment.yml..." -ForegroundColor Yellow
$result = conda env create -f environment.yml

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create environment from environment.yml" -ForegroundColor Red
    Write-Host "Trying manual installation..." -ForegroundColor Yellow
    Write-Host ""
    
    # Fallback: manual creation
    conda create -n ultimon-backend python=3.11 -y
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create base environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host "Activating environment and installing packages..." -ForegroundColor Yellow
    
    # Note: In PowerShell, we need to use conda run instead of activate for scripts
    conda run -n ultimon-backend pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install requirements" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To activate the environment, run:" -ForegroundColor Cyan
Write-Host "  conda activate ultimon-backend" -ForegroundColor White
Write-Host ""
Write-Host "To start the server, run:" -ForegroundColor Cyan
Write-Host "  cd server" -ForegroundColor White
Write-Host "  conda activate ultimon-backend" -ForegroundColor White
Write-Host "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "Make sure LibreHardwareMonitor is running with HTTP server enabled on port 8085" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green

Read-Host "Press Enter to exit" 