#!/usr/bin/env python3
"""
Ultimate Sensor Monitor - Backend Server Launcher (cross-platform).

Locates the project virtual environment (root ``.venv`` by default, falling back
to ``server/.venv`` or ``server/venv``), then starts the FastAPI backend via
uvicorn with auto-reload enabled.

Usage:
    python start_backend.py            # from project root
    python start_backend.py --no-reload  # production-style (no auto-reload)

Notes:
    - On Windows, hardware sensors (LibreHardwareMonitor) require administrator
      privileges. Run this script from an elevated terminal for full sensor
      access, or use ``start_ultimon_full.ps1`` which elevates automatically.
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
from pathlib import Path

# --- Configuration ---------------------------------------------------------
HOST = "0.0.0.0"
PORT = 8100
APP_MODULE = "app.main:app"
# ---------------------------------------------------------------------------


def print_banner() -> None:
    """Print the startup banner."""
    print("=" * 64)
    print("           Ultimate Sensor Monitor - Backend Server")
    print("=" * 64)
    print()


def project_root() -> Path:
    """Return the project root (parent of this script)."""
    return Path(__file__).resolve().parent


def find_venv_python() -> tuple[str | None, Path | None]:
    """
    Locate a virtual environment and return (python_executable, venv_path).

    Search order:
      1. <root>/.venv        (preferred — matches the project's actual layout)
      2. <root>/server/.venv
      3. <root>/server/venv
    """
    root = project_root()
    is_windows = platform.system() == "Windows"
    bin_dir = "Scripts" if is_windows else "bin"
    exe = "python.exe" if is_windows else "python"

    candidates = [
        root / ".venv",
        root / "server" / ".venv",
        root / "server" / "venv",
    ]

    for venv in candidates:
        python_exe = venv / bin_dir / exe
        if python_exe.exists():
            return str(python_exe), venv
    return None, None


def check_admin_windows() -> bool:
    """Return True if running with administrator privileges on Windows."""
    if platform.system() != "Windows":
        return True
    try:
        import ctypes

        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def start_server(reload: bool = True) -> int:
    """Start the backend server. Returns the process exit code."""
    root = project_root()
    server_dir = root / "server"

    if not server_dir.is_dir():
        print(f"Error: server directory not found at {server_dir}")
        print("Please run this script from the UltimateSensorMonitor root directory.")
        return 1

    python_cmd, venv_path = find_venv_python()
    if python_cmd:
        print(f"[1/3] Using virtual environment: {venv_path}")
    else:
        print("[1/3] No virtual environment found, using system Python")
        python_cmd = sys.executable

    print(f"[2/3] Working directory: {server_dir}")
    print(f"[3/3] Starting backend server (reload={'on' if reload else 'off'})...")
    print()
    print(f"  Server:       http://localhost:{PORT}")
    print(f"  API docs:     http://localhost:{PORT}/docs")
    print(f"  WebSocket:    ws://localhost:{PORT}/ws")
    print()
    print("Press Ctrl+C to stop the server.")
    print("=" * 64)
    print()

    if platform.system() == "Windows" and not check_admin_windows():
        print(
            "WARNING: Not running as administrator. Hardware sensors "
            "(LibreHardwareMonitor) will be unavailable. Re-run from an "
            "elevated terminal for full sensor access."
        )
        print()

    cmd = [
        python_cmd,
        "-m",
        "uvicorn",
        APP_MODULE,
        "--host",
        HOST,
        "--port",
        str(PORT),
    ]
    if reload:
        cmd.append("--reload")

    env = os.environ.copy()
    # Ensure the server's CWD is the server/ directory so relative data paths work.
    try:
        return subprocess.run(cmd, cwd=str(server_dir), env=env, check=False).returncode
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
        return 0
    except FileNotFoundError:
        print(f"\nError: Python executable not found: {python_cmd}")
        print("Install dependencies with: pip install -r server/requirements.txt")
        return 1


def main() -> int:
    print_banner()
    reload = "--no-reload" not in sys.argv
    return start_server(reload=reload)


if __name__ == "__main__":
    sys.exit(main())
