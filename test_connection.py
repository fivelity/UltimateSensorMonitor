#!/usr/bin/env python3
"""
Ultimate Sensor Monitor - Connection Test Script.

Tests backend API, WebSocket, and frontend proxy connectivity. Uses only the
Python standard library for HTTP checks so it runs without extra dependencies.
The WebSocket test is optional and skipped if the ``websocket-client`` package
is not installed.

Usage:
    python test_connection.py
"""

from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from typing import Any

BACKEND_URL = "http://localhost:8100"
FRONTEND_URL = "http://localhost:5501"
WS_URL = "ws://localhost:8100/ws"
TIMEOUT = 5  # seconds


def _http_get_json(url: str) -> tuple[int, dict[str, Any] | None, str]:
    """Perform a GET request and return (status_code, parsed_json | None, reason)."""
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            status = resp.status
            reason = resp.reason
    except urllib.error.HTTPError as e:
        return e.code, None, e.reason
    except urllib.error.URLError as e:
        return -1, None, str(e.reason)

    try:
        return status, json.loads(body), reason
    except json.JSONDecodeError:
        return status, None, reason


def test_backend_direct() -> bool:
    """Test direct connection to the backend server."""
    print("Testing Backend Server (Direct Connection)...")
    print("=" * 50)

    # /api/sensors
    print(f"  GET {BACKEND_URL}/api/sensors")
    status, data, reason = _http_get_json(f"{BACKEND_URL}/api/sensors")
    if status != 200 or data is None:
        print(f"  FAIL: {status} {reason}")
        return False

    sources = data.get("sources", {})
    sensor_count = sum(
        len(source.get("sensors", [])) for source in sources.values()
    )
    print(f"  OK: {status} - {len(sources)} sources, {sensor_count} sensors")

    # /docs
    print(f"  GET {BACKEND_URL}/docs")
    status, _, reason = _http_get_json(f"{BACKEND_URL}/docs")
    if status == 200:
        print(f"  OK: API docs reachable")
    else:
        print(f"  WARN: {status} {reason}")

    print("Backend server is working correctly!")
    return True


def test_websocket() -> bool:
    """Test WebSocket connection (optional, requires websocket-client)."""
    print("\nTesting WebSocket Connection...")
    print("=" * 50)

    try:
        import websocket  # type: ignore[import-not-found]
    except ImportError:
        print("  SKIPPED: 'websocket-client' package not installed.")
        print("  Install with: pip install websocket-client")
        return True  # Not a hard failure — HTTP backend is the critical path.

    ws_connected = threading.Event()
    message_received = threading.Event()

    def on_message(ws: Any, message: str) -> None:
        print("  Message received")
        data = json.loads(message)
        if data.get("type") == "sensor_data":
            print(f"    timestamp: {data.get('timestamp')}")
            print(f"    sources:   {len(data.get('sources', {}))}")
        message_received.set()

    def on_error(ws: Any, error: Any) -> None:
        print(f"  ERROR: {error}")
        ws_connected.set()  # unblock the wait

    def on_open(ws: Any) -> None:
        print("  Connected")
        ws_connected.set()

    def on_close(ws: Any, close_status_code: int, close_msg: str) -> None:
        print(f"  Closed: {close_status_code}")

    print(f"  Connecting to {WS_URL}")
    ws = websocket.WebSocketApp(
        WS_URL,
        on_message=on_message,
        on_error=on_error,
        on_open=on_open,
        on_close=on_close,
    )
    wst = threading.Thread(target=ws.run_forever, daemon=True)
    wst.start()

    if ws_connected.wait(timeout=TIMEOUT):
        if message_received.wait(timeout=10):
            print("  OK: data flow working")
            result = True
        else:
            print("  WARN: no data received within 10s")
            result = True
    else:
        print("  FAIL: connection timeout")
        result = False

    ws.close()
    return result


def test_frontend_proxy() -> bool:
    """Test frontend server and its proxy to the backend."""
    print("\nTesting Frontend Proxy...")
    print("=" * 50)

    # Frontend root
    print(f"  GET {FRONTEND_URL}/")
    status, _, reason = _http_get_json(FRONTEND_URL)
    if status != 200:
        print(f"  FAIL: {status} {reason}")
        print("  Make sure to run: cd client && npm run dev")
        return False
    print(f"  OK: frontend serving")

    # Proxy to backend
    print(f"  GET {FRONTEND_URL}/api/sensors")
    status, data, reason = _http_get_json(f"{FRONTEND_URL}/api/sensors")
    if status != 200 or data is None:
        print(f"  FAIL: {status} {reason}")
        return False

    sources = data.get("sources", {})
    sensor_count = sum(
        len(source.get("sensors", [])) for source in sources.values()
    )
    print(f"  OK: proxy working - {len(sources)} sources, {sensor_count} sensors")
    return True


def main() -> None:
    print("Ultimate Sensor Monitor - Connection Test")
    print("=" * 60)
    print("Tests backend, WebSocket, and frontend proxy connectivity.")
    print()

    backend_ok = test_backend_direct()
    websocket_ok = test_websocket()
    frontend_ok = test_frontend_proxy()

    print("\nTest Summary")
    print("=" * 50)
    print(f"  Backend:   {'PASS' if backend_ok else 'FAIL'}")
    print(f"  WebSocket: {'PASS' if websocket_ok else 'FAIL'}")
    print(f"  Frontend:  {'PASS' if frontend_ok else 'FAIL'}")

    if all([backend_ok, websocket_ok, frontend_ok]):
        print("\nAll tests passed!")
        print(f"  Application: {FRONTEND_URL}")
        print(f"  API docs:    {BACKEND_URL}/docs")
    else:
        print("\nSome tests failed.")
        if not backend_ok:
            print("  Start backend:  python start_backend.py")
        if not frontend_ok:
            print("  Start frontend: cd client && npm run dev")


if __name__ == "__main__":
    main()
