@echo off
echo Ultimate Sensor Monitor - Starting Backend Server...
echo.
echo NOTE: Admin privileges are required for hardware monitoring!
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Running with admin privileges
    echo.
) else (
    echo This script requires admin privileges to access hardware sensors.
    echo Restarting with admin privileges...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %~dp0 && %0' -Verb runAs"
    exit /b
)

REM Change to server directory
cd /d "%~dp0"

REM Initialize conda for this session
echo Initializing conda environment...
call conda init cmd.exe >nul 2>&1

REM Check if conda environment exists, create if it doesn't
echo Checking conda environment...
conda info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo Creating conda environment from environment.yml...
    conda env create -f environment.yml
    if errorlevel 1 (
        echo ERROR: Failed to create conda environment
        echo Falling back to base environment with pip install...
        goto :pip_fallback
    )
) else (
    echo ✓ Found existing ultimon-backend environment
)

REM Activate conda environment
echo Activating conda environment: ultimon-backend...
call conda activate ultimon-backend
if errorlevel 1 (
    echo ERROR: Failed to activate conda environment
    echo Falling back to base environment...
    goto :pip_fallback
)

goto :start_server

:pip_fallback
echo Installing required packages with pip...
pip install fastapi uvicorn pydantic pydantic-settings websockets python-multipart aiofiles python-dotenv aiohttp pythonnet HardwareMonitor
if errorlevel 1 (
    echo ERROR: Failed to install required packages
    pause
    exit /b 1
)

:start_server
echo.
echo Starting FastAPI server with LibreHardwareMonitor support...
echo.
echo Server will be available at: http://localhost:8100
echo WebSocket endpoint: ws://localhost:8100/ws
echo API documentation: http://localhost:8100/docs
echo.
echo Press Ctrl+C to stop the server
echo.
echo ======================================================
echo.

python -m app.main

echo.
echo Server stopped.
pause 