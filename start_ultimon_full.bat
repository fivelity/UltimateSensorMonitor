@echo off
echo ========================================
echo Ultimate Sensor Monitor Full Stack Launcher
echo ========================================
echo.
echo This will start both:
echo   1. Backend Server (Admin + Simple Pip)
echo   2. Frontend Client (Regular)
echo.
echo Starting backend with admin privileges...
echo Frontend will start in regular mode...
echo.

REM Start backend in a new admin window
echo 🔹 Starting Backend Server (Admin Required)...
start "Ultimate Sensor Monitor - Backend" /min cmd /c "cd /d %~dp0\server && start_server_simple.bat"

REM Wait a moment for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend in current window
echo 🔸 Starting Frontend Client...
cd /d "%~dp0\client"

echo.
echo ========================================
echo Starting development servers...
echo Backend: http://localhost:8100 (Admin Window)
echo Frontend: http://localhost:5502 (This Window)
echo.
echo Both servers will open automatically.
echo Press Ctrl+C in either window to stop that service.
echo ========================================
echo.

REM Install frontend dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Start frontend development server
npm run dev 