@echo off
echo Testing HardwareMonitor Package...
echo.
echo NOTE: Admin privileges are required for hardware monitoring!
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with admin privileges ✓
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

REM Check if conda environment exists
"C:\Users\jpfive\Anaconda3\Scripts\conda.exe" info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo ERROR: Conda environment 'ultimon-backend' not found.
    echo Please run setup_windows_env.bat first to create the environment.
    pause
    exit /b 1
)

echo Running HardwareMonitor package test...
echo.
"C:\Users\jpfive\Anaconda3\envs\ultimon-backend\python.exe" test_hwmonitor_package.py

echo.
echo Test completed!
pause 