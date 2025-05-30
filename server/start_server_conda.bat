@echo off
echo Starting Ultimate Sensor Monitor Backend with Conda...
echo.

REM Change to server directory
cd /d "%~dp0"

REM Check if conda environment exists
"C:\Users\jpfive\Anaconda3\Scripts\conda.exe" info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo ERROR: Conda environment 'ultimon-backend' not found.
    echo Please run setup_windows_env.bat first to create the environment.
    pause
    exit /b 1
)

echo Starting FastAPI server...
echo.
echo Server will be available at: http://localhost:8100
echo API documentation: http://localhost:8100/docs
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server using uvicorn from the conda environment
"C:\Users\jpfive\Anaconda3\envs\ultimon-backend\Scripts\uvicorn.exe" app.main:app --reload --host 0.0.0.0 --port 8100 