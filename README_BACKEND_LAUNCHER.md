# Ultimate Sensor Monitor - Backend Server Launchers

This directory contains multiple scripts to easily launch the Ultimate Sensor Monitor backend server. Choose the one that works best for your environment.

## 🚀 Quick Start

### Option 1: Windows Batch File (Recommended for Windows)
```bash
# Double-click or run from command prompt
start_backend.bat
```

### Option 2: PowerShell Script (Windows with PowerShell)
```powershell
# Run from PowerShell
.\start_backend.ps1
```

### Option 3: Python Script (Cross-platform)
```bash
# Works on Windows, macOS, and Linux
python start_backend.py
```

## 📋 What These Scripts Do

All launcher scripts perform the same basic steps:

1. **✅ Environment Check**: Verify you're in the correct directory
2. **🐍 Python Environment**: Automatically detect and activate virtual environment if available
3. **🚀 Server Launch**: Start the FastAPI server with proper configuration

## 🌐 Server Details

Once started, the server will be available at:

- **Main Server**: http://localhost:8100
- **API Documentation**: http://localhost:8100/docs (Interactive Swagger UI)
- **WebSocket Endpoint**: ws://localhost:8100/ws
- **Alternative Docs**: http://localhost:8100/redoc (ReDoc UI)

## 🔧 Prerequisites

### Required
- **Python 3.8+** installed and available in PATH
- **Dependencies installed** (see installation section)

### Optional but Recommended
- **Virtual Environment** set up in `server/venv/`
- **Administrator privileges** (for hardware sensor access)

## 📦 Installation

If you haven't set up the backend yet:

```bash
# Navigate to server directory
cd server

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 🛠️ Troubleshooting

### Common Issues

**"server directory not found"**
- Make sure you're running the script from the `UltimateSensorMonitor` root directory
- The script should be in the same folder as the `server/` directory

**"Python not found"**
- Ensure Python is installed and added to your system PATH
- Try using `python3` instead of `python` on macOS/Linux

**"Module 'uvicorn' not found"**
- Install dependencies: `pip install -r requirements.txt`
- Make sure you're using the correct Python environment

**Permission errors on Windows**
- Run as Administrator for full hardware sensor access
- Some sensors require elevated privileges

**Port 8100 already in use**
- Stop any existing server instances
- Check for other applications using port 8100
- Modify the port in the script if needed

### Getting Help

1. **Check server logs** - The console output will show detailed error messages
2. **Verify installation** - Ensure all requirements are installed
3. **Test manually** - Try running: `python -m uvicorn app.main:app --port 8100`

## 🎯 Usage Tips

### Development Mode
All scripts start the server in development mode with auto-reload enabled. The server will automatically restart when you make changes to the code.

### Production Mode
For production deployment, modify the scripts to remove the `--reload` flag and consider using proper WSGI servers like Gunicorn.

### Custom Configuration
You can modify the scripts to change:
- Port number (default: 8100)
- Host binding (default: 0.0.0.0 for all interfaces)
- Reload behavior
- Log levels

## 📁 File Overview

- `start_backend.bat` - Windows batch file (double-click friendly)
- `start_backend.ps1` - PowerShell script (enhanced Windows experience)
- `start_backend.py` - Cross-platform Python launcher
- `README_BACKEND_LAUNCHER.md` - This documentation file

## 🔗 Related Files

- `server/app/main.py` - Main FastAPI application
- `server/requirements.txt` - Python dependencies
- `server/venv/` - Virtual environment (if created)

---

**Happy monitoring!** 🎉 