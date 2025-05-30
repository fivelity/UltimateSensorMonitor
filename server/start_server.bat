@echo off
echo Starting Ultimate Sensor Monitor Backend...
echo.

REM Check if conda environment exists
conda info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo ERROR: Conda environment 'ultimon-backend' not found.
    echo Please run setup_windows_env.bat first to create the environment.
    pause
    exit /b 1
)

echo Activating conda environment...
call conda activate ultimon-backend

echo Starting FastAPI server...
echo.
echo Server will be available at: http://localhost:8000
echo API documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 