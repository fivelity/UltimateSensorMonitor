@echo off
title Ultimate Sensor Monitor - Backend Server
echo ================================================================
echo           Ultimate Sensor Monitor - Backend Server
echo ================================================================
echo.

REM Check if we're in the right directory
if not exist "server" (
    echo Error: server directory not found!
    echo Please run this script from the UltimateSensorMonitor root directory.
    echo.
    pause
    exit /b 1
)

echo [1/3] Changing to server directory...
cd server

echo [2/3] Checking Python environment...
if exist "venv\Scripts\activate.bat" (
    echo Found virtual environment, activating...
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found, using system Python
)

echo [3/3] Starting backend server...
echo.
echo Server starting on: http://localhost:8100
echo API Documentation: http://localhost:8100/docs  
echo WebSocket endpoint: ws://localhost:8100/ws
echo.
echo Press Ctrl+C to stop the server
echo ================================================================
echo.

REM Run the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload

echo.
echo Server stopped.
pause 