# Ultimate Sensor Monitor Backend - Windows Setup Guide

This guide will help you set up the Ultimate Sensor Monitor backend on Windows using Miniconda.

## Prerequisites

1. **Miniconda or Anaconda**: Download and install from [https://docs.conda.io/en/latest/miniconda.html](https://docs.conda.io/en/latest/miniconda.html)
2. **LibreHardwareMonitorLib.dll**: Already included in project root for direct hardware access
   - No need to run LibreHardwareMonitor application separately
   - Provides direct hardware monitoring via .NET DLL

## Quick Setup

### Option 1: Automated Setup (Recommended)

1. Open Command Prompt or PowerShell as Administrator
2. Navigate to the `server` directory:
   ```cmd
   cd path\to\UltimateSensorMonitor\server
   ```
3. Run the setup script:
   ```cmd
   # For Command Prompt:
   setup_windows_env.bat
   
   # For PowerShell:
   .\setup_windows_env.ps1
   ```

### Option 2: Manual Setup

1. Create conda environment:
   ```cmd
   conda create -n ultimon-backend python=3.11 -y
   ```

2. Activate the environment:
   ```cmd
   conda activate ultimon-backend
   ```

3. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```

## Starting the Server

### Option 1: Using the launcher script (from project root)
```powershell
.\start_ultimon_full.ps1   # full stack (elevates backend automatically)
# or backend only:
python start_backend.py
```

### Option 2: Manual start
```cmd
conda activate ultimon-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Accessing the API

Once the server is running:
- **API Base URL**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Test Endpoint**: http://localhost:8000/api/sensors

## Hardware Monitoring Methods

The backend supports two methods for LibreHardwareMonitor integration:

### Method 1: Direct DLL Access (Default & Recommended)
- Uses `LibreHardwareMonitorLib.dll` directly via pythonnet
- **Advantages**: 
  - No need to run LibreHardwareMonitor application
  - More reliable and faster
  - Direct hardware access
  - Better error handling
- **Requirements**: 
  - Windows platform
  - Administrator privileges (for hardware access)
  - pythonnet package (included in requirements)

### Method 2: HTTP API (Legacy)
- Connects to LibreHardwareMonitor HTTP server
- **Use only if DLL approach fails**
- Requires running LibreHardwareMonitor application with HTTP server enabled

## Testing Hardware Integration

To test if hardware monitoring is working:

```cmd
conda activate ultimon-backend
cd server
python test_lhm_dll.py
```

This will verify:
- DLL can be loaded
- Sensors can be detected
- Data can be read from hardware

## LibreHardwareMonitor HTTP Setup (Legacy Method)

⚠️ **Only needed if DLL approach fails**

To use HTTP API fallback:

1. Download and install LibreHardwareMonitor application
2. Run as Administrator
3. Go to Options → HTTP Server
4. Enable "Enable HTTP Server"
5. Set Port to 8085
6. Set Listen Address to "0.0.0.0" (to allow external connections)
7. Click Apply and restart LibreHardwareMonitor

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**
   - Make sure the conda environment is activated: `conda activate ultimon-backend`
   - Reinstall dependencies: `pip install -r requirements.txt`

2. **Permission Errors**
   - Run Command Prompt/PowerShell as Administrator
   - Check Windows Firewall settings for port 8000

3. **DLL Loading Issues**
   - Ensure `LibreHardwareMonitorLib.dll` exists in project root
   - Run as Administrator for hardware access
   - Check pythonnet installation: `pip install pythonnet==3.0.3`

4. **Hardware Access Denied**
   - Must run as Administrator for direct hardware access
   - Some antivirus software may block hardware monitoring

5. **Conda Environment Issues**
   - Remove and recreate: `conda env remove -n ultimon-backend -y` then rerun setup

### Dependencies Included

- **FastAPI**: Web framework for the API
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **Pydantic-Settings**: Configuration management
- **WebSockets**: Real-time communication
- **AIOHTTP**: Async HTTP client for LibreHardwareMonitor HTTP fallback
- **PythonNet**: .NET integration for direct DLL access

## Testing

To verify the setup:

1. Start the server
2. Open http://localhost:8000/docs in your browser
3. Try the `/api/sensors` endpoint
4. Check if real hardware sensors are detected
5. Run the DLL test: `python test_lhm_dll.py`

## Development

For development with auto-reload:
```cmd
conda activate ultimon-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Performance Notes

- **DLL Method**: Faster, more reliable, direct hardware access
- **HTTP Method**: Slower, requires separate application running
- **Mock Sensors**: Always available as fallback for testing

## Next Steps

After successful setup:
1. Set up the frontend (SvelteKit client)
2. Configure sensor sources in the settings
3. Start monitoring your system!

## Security Considerations

- Administrator privileges required for hardware access
- DLL provides direct system access - ensure trusted environment
- Consider firewall rules for network access to API 