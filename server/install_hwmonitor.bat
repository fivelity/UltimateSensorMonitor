@echo off
echo Installing HardwareMonitor package...
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

echo Installing HardwareMonitor package in ultimon-backend environment...
"C:\Users\jpfive\Anaconda3\envs\ultimon-backend\Scripts\pip.exe" install HardwareMonitor

echo.
echo Testing HardwareMonitor installation...
"C:\Users\jpfive\Anaconda3\envs\ultimon-backend\python.exe" -c "import HardwareMonitor; print('HardwareMonitor package installed successfully!')"

echo.
echo Done!
pause 