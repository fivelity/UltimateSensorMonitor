# Ultimate Sensor Monitor - Server Launchers

The project root contains the launcher scripts. There is no longer a set of
per-variant scripts inside `server/` — the root launchers detect the virtual
environment and handle admin elevation directly.

## Available launchers (in project root)

| Script | Platform | Purpose |
|--------|----------|---------|
| `start_backend.py` | Cross-platform | Starts only the FastAPI backend (auto-reload). |
| `start_ultimon_full.ps1` | Windows | Starts backend (elevated) **and** SvelteKit frontend. |
| `start_services.sh` | Linux / macOS / WSL | Manages both services with start/stop/status/logs. |

## Quick start

### Windows (full stack)
```powershell
.\start_ultimon_full.ps1
```
The backend launches in an elevated window (required for LibreHardwareMonitor
hardware sensor access); the frontend runs in the current terminal.

### Backend only (any platform)
```bash
python start_backend.py
```
On Windows, run from an elevated terminal for full hardware sensor access.

### Linux / macOS / WSL
```bash
./start_services.sh start    # start both
./start_services.sh status   # check status
./start_services.sh stop     # stop both
./start_services.sh logs     # tail logs
```

## Server details

Once started, the backend is available at:

- **Server**: http://localhost:8100
- **API docs (Swagger)**: http://localhost:8100/docs
- **API docs (ReDoc)**: http://localhost:8100/redoc
- **WebSocket**: ws://localhost:8100/ws

## Prerequisites

- **Python 3.10+** with a virtual environment at the project root (`.venv`).
  The launchers auto-detect `.venv`, `server/.venv`, or `server/venv`.
- Dependencies installed: `pip install -r server/requirements.txt`
- **Node.js 18+** and `npm install` run in `client/` (for the frontend).
- **Administrator privileges** on Windows for hardware sensor access.

## Troubleshooting

**"server directory not found"** — run the launcher from the project root
(the folder containing `server/` and `client/`).

**"Module 'uvicorn' not found"** — install dependencies into the active
virtual environment: `pip install -r server/requirements.txt`.

**Hardware sensors unavailable** — on Windows, LibreHardwareMonitor requires
admin privileges. Use `start_ultimon_full.ps1` (auto-elevates) or run
`python start_backend.py` from an elevated terminal.

**Port 8100 already in use** — stop any existing backend instance, or change
the port in `server/app/config.py` (`ULTIMON_PORT` env var).

## Related files

- `server/app/main.py` — FastAPI application entry point
- `server/app/config.py` — configuration (host, port, sensor toggles)
- `server/requirements.txt` — Python dependencies
- `test_connection.py` — connectivity test for backend, WebSocket, and frontend
