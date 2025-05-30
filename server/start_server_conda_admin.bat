@echo off
echo Ultimate Sensor Monitor - Starting Backend Server (Conda)...
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

REM Try to find conda installation
set CONDA_ROOT=
set CONDA_ENV_PATH=
set CONDA_SCRIPTS=

REM Check common conda locations
if exist "C:\Users\jpfive\Anaconda3\Scripts\conda.exe" (
    set CONDA_ROOT=C:\Users\jpfive\Anaconda3
    set CONDA_ENV_PATH=%CONDA_ROOT%\envs\ultimon-backend
    set CONDA_SCRIPTS=%CONDA_ROOT%\Scripts
    echo Found Anaconda installation at: %CONDA_ROOT%
) else if exist "C:\Users\jpfive\miniconda3\Scripts\conda.exe" (
    set CONDA_ROOT=C:\Users\jpfive\miniconda3
    set CONDA_ENV_PATH=%CONDA_ROOT%\envs\ultimon-backend
    set CONDA_SCRIPTS=%CONDA_ROOT%\Scripts
    echo Found Miniconda installation at: %CONDA_ROOT%
) else if exist "C:\ProgramData\miniconda3\Scripts\conda.exe" (
    set CONDA_ROOT=C:\ProgramData\miniconda3
    set CONDA_ENV_PATH=%CONDA_ROOT%\envs\ultimon-backend
    set CONDA_SCRIPTS=%CONDA_ROOT%\Scripts
    echo Found System Miniconda installation at: %CONDA_ROOT%
) else (
    echo ERROR: Could not find conda installation
    echo Please make sure Anaconda or Miniconda is installed
    echo Trying fallback with PATH conda...
    conda --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: conda not found in PATH either
        echo Please install Anaconda or Miniconda and try again
        pause
        exit /b 1
    )
    goto :use_path_conda
)

set CONDA_ENV_PYTHON=%CONDA_ENV_PATH%\python.exe

echo Checking conda environment...
"%CONDA_SCRIPTS%\conda.exe" info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo Creating conda environment from environment.yml...
    "%CONDA_SCRIPTS%\conda.exe" env create -f environment.yml
    if errorlevel 1 (
        echo ERROR: Failed to create conda environment
        echo Trying fallback installation...
        goto :fallback_install
    )
    echo ✓ Environment created successfully
) else (
    echo ✓ Found existing ultimon-backend environment
)

REM Verify Python executable exists
if not exist "%CONDA_ENV_PYTHON%" (
    echo ERROR: Python executable not found at: %CONDA_ENV_PYTHON%
    goto :fallback_install
)

goto :start_server

:use_path_conda
echo Using conda from PATH...
conda info -e | findstr "ultimon-backend" >nul
if errorlevel 1 (
    echo Creating environment using PATH conda...
    conda env create -f environment.yml
    if errorlevel 1 goto :fallback_install
)
echo Activating environment and starting server...
call conda activate ultimon-backend
python -m app.main
goto :end

:fallback_install
echo.
echo Attempting fallback installation with pip...
python -m pip install fastapi uvicorn pydantic pydantic-settings websockets python-multipart aiofiles python-dotenv aiohttp pythonnet HardwareMonitor
if errorlevel 1 (
    echo ERROR: Fallback installation failed
    echo Please check your Python installation
    pause
    exit /b 1
)
echo ✓ Fallback installation completed
set CONDA_ENV_PYTHON=python
goto :start_server

:start_server
echo.
echo Starting FastAPI server with LibreHardwareMonitor support...
echo Using Python: %CONDA_ENV_PYTHON%
echo.
echo Server will be available at: http://localhost:8100
echo WebSocket endpoint: ws://localhost:8100/ws
echo API documentation: http://localhost:8100/docs
echo.
echo Press Ctrl+C to stop the server
echo.
echo ======================================================
echo.

REM Start the server
if defined CONDA_ENV_PYTHON (
    "%CONDA_ENV_PYTHON%" -m app.main
) else (
    python -m app.main
)

:end
echo.
echo Server stopped.
pause 