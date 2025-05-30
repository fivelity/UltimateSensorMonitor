#!/usr/bin/env python3
"""
Ultimate Sensor Monitor - Backend Server Launcher
Cross-platform Python launcher script
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def print_banner():
    """Print startup banner"""
    print("=" * 64)
    print("           Ultimate Sensor Monitor - Backend Server")
    print("=" * 64)
    print()

def check_environment():
    """Check if we're in the correct directory and environment"""
    # Check if server directory exists
    if not Path("server").exists():
        print("❌ Error: server directory not found!")
        print("Please run this script from the UltimateSensorMonitor root directory.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Change to server directory
    os.chdir("server")
    print("✅ [1/3] Changed to server directory")

def activate_virtual_environment():
    """Activate virtual environment if available"""
    venv_path = Path("venv")
    
    if platform.system() == "Windows":
        activate_script = venv_path / "Scripts" / "activate.bat"
        python_exe = venv_path / "Scripts" / "python.exe"
    else:
        activate_script = venv_path / "bin" / "activate"
        python_exe = venv_path / "bin" / "python"
    
    if python_exe.exists():
        print("✅ [2/3] Found virtual environment")
        return str(python_exe)
    else:
        print("⚠️  [2/3] Virtual environment not found, using system Python")
        return "python"

def start_server(python_cmd):
    """Start the backend server"""
    print("🚀 [3/3] Starting backend server...")
    print()
    print("📡 Server starting on: http://localhost:8100")
    print("📚 API Documentation: http://localhost:8100/docs")
    print("🔌 WebSocket endpoint: ws://localhost:8100/ws")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 64)
    print()
    
    try:
        # Run the server
        cmd = [
            python_cmd, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8100", 
            "--reload"
        ]
        
        subprocess.run(cmd, check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        print("Make sure all dependencies are installed:")
        print(f"  {python_cmd} -m pip install -r requirements.txt")
    except FileNotFoundError:
        print(f"\n❌ Python not found: {python_cmd}")
        print("Please ensure Python is installed and available in PATH")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    finally:
        print("\n👋 Goodbye!")
        input("Press Enter to exit...")

def main():
    """Main launcher function"""
    print_banner()
    check_environment()
    python_cmd = activate_virtual_environment()
    start_server(python_cmd)

if __name__ == "__main__":
    main() 