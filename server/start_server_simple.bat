@echo off
echo Ultimate Sensor Monitor - Simple Backend Server
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

echo Installing required dependencies with pip...
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic pydantic-settings websockets python-multipart aiofiles python-dotenv aiohttp pythonnet HardwareMonitor

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo Please check your Python installation
    pause
    exit /b 1
)

echo.
echo ✓ Dependencies installed successfully
echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8100
echo WebSocket endpoint: ws://localhost:8100/ws
echo API documentation: http://localhost:8100/docs
echo.
echo Press Ctrl+C to stop the server
echo.
echo ======================================================
echo.

REM Start the server
python -m app.main

echo.
echo Server stopped.
pause 