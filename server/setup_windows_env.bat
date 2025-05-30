@echo off
echo Setting up Ultimate Sensor Monitor Backend Environment for Windows...
echo.

REM Check if conda is available
conda --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Conda is not available in PATH.
    echo Please make sure Miniconda or Anaconda is installed and added to PATH.
    echo You can download Miniconda from: https://docs.conda.io/en/latest/miniconda.html
    pause
    exit /b 1
)

echo Found conda installation.
echo.

REM Remove existing environment if it exists
echo Removing existing environment (if any)...
conda env remove -n ultimon-backend -y

REM Create new environment from yml file
echo Creating new conda environment from environment.yml...
conda env create -f environment.yml

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create environment from environment.yml
    echo Trying manual installation...
    echo.
    
    REM Fallback: manual creation
    conda create -n ultimon-backend python=3.11 -y
    if errorlevel 1 (
        echo ERROR: Failed to create base environment
        pause
        exit /b 1
    )
    
    echo Activating environment and installing packages...
    call conda activate ultimon-backend
    pip install -r requirements.txt
    
    if errorlevel 1 (
        echo ERROR: Failed to install requirements
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Environment setup complete!
echo.
echo To activate the environment, run:
echo   conda activate ultimon-backend
echo.
echo To start the server, run:
echo   cd server
echo   conda activate ultimon-backend
echo   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo Make sure LibreHardwareMonitor is running with HTTP server enabled on port 8085
echo ========================================
pause 