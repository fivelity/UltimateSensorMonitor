"""LibreHardwareMonitor sensor integration.

The actual HardwareMonitor work is delegated to a dedicated subprocess
(``librehardware_worker.py``). The underlying pythonnet calls hold the Python
GIL while ``OpenComputer`` initializes, which would otherwise block the FastAPI
asyncio event loop and make the server unresponsive during startup.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from .base import BaseSensor
from ..models import ApiHardwareNode, SensorData

logger = logging.getLogger(__name__)

WORKER_MODULE = "app.sensors.librehardware_worker"


class LibreHardwareSensor(BaseSensor):
    """Async wrapper that delegates blocking sensor calls to a worker process."""

    def __init__(self) -> None:
        super().__init__("LibreHardwareMonitor")
        self.is_active: bool | None = None
        self._connection_tested = False
        self._process: asyncio.subprocess.Process | None = None
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._worker_started = False
        self._stderr_task: asyncio.Task[None] | None = None
        self._stdout_task: asyncio.Task[None] | None = None
        self._command_lock = asyncio.Lock()

    async def _ensure_worker(self) -> bool:
        """Start the worker process and open the control socket.

        Returns True if the worker process was started successfully. The actual
        HardwareMonitor initialization is triggered separately via ``init``.
        """
        if self._worker_started:
            return self._process is not None

        self._worker_started = True
        server_dir = Path(__file__).resolve().parent.parent.parent
        python_exe = sys.executable

        # The worker will write its chosen port to this file.
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".port", delete=False, encoding="utf-8"
        ) as port_file:
            port_file_path = port_file.name

        try:
            logger.info("Starting LibreHardware worker process...")
            self._process = await asyncio.create_subprocess_exec(
                python_exe,
                "-m",
                WORKER_MODULE,
                "--port-file",
                port_file_path,
                stdin=None,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(server_dir),
            )

            self._stdout_task = asyncio.create_task(
                self._forward_stdout("[LibreHardware worker] ")
            )
            self._stderr_task = asyncio.create_task(
                self._forward_stderr("[LibreHardware worker] ")
            )

            port = await self._wait_for_port(port_file_path)
            logger.info(f"Connecting to worker on port {port}")
            self._reader, self._writer = await asyncio.open_connection(
                "127.0.0.1", port, limit=2 * 1024 * 1024
            )
            return True
        except Exception as e:
            logger.error(f"Failed to start LibreHardware worker: {e}")
            self.is_active = False
            self._connection_tested = True
            await self._terminate_worker()
            return False
        finally:
            try:
                os.remove(port_file_path)
            except FileNotFoundError:
                pass
            except Exception as e:
                logger.debug(f"Could not remove worker port file: {e}")

    async def _wait_for_port(self, port_file_path: str, timeout: float = 30.0) -> int:
        """Read the worker port from the temp file, polling until it appears."""
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            try:
                with open(port_file_path, encoding="utf-8") as f:
                    content = f.read().strip()
                if content:
                    return int(content)
            except (FileNotFoundError, ValueError):
                pass
            await asyncio.sleep(0.1)
        raise TimeoutError(f"Worker did not write its port within {timeout}s")

    async def _send_command(
        self, command: dict[str, Any], timeout: float | None = None
    ) -> dict[str, Any]:
        """Send a JSON command to the worker and return the parsed response.

        The worker is synchronous, so commands are serialized through a single
        socket. The lock prevents concurrent coroutines from interleaving reads.
        """
        if self._reader is None or self._writer is None:
            raise RuntimeError("Worker connection is not open")

        async with self._command_lock:
            line = (json.dumps(command) + "\n").encode("utf-8")
            self._writer.write(line)
            await self._writer.drain()

            response_line = await asyncio.wait_for(
                self._reader.readline(), timeout=timeout
            )
            if not response_line:
                raise RuntimeError("Worker closed the connection")
            return json.loads(response_line.decode("utf-8"))

    async def _forward_stdout(self, prefix: str) -> None:
        """Forward worker stdout lines to the parent logger."""
        if self._process is None or self._process.stdout is None:
            return
        while True:
            line = await self._process.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if text:
                logger.info(f"{prefix}{text}")

    async def _forward_stderr(self, prefix: str) -> None:
        """Forward worker stderr lines to the parent logger."""
        if self._process is None or self._process.stderr is None:
            return
        while True:
            line = await self._process.stderr.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if text:
                logger.info(f"{prefix}{text}")

    async def _terminate_worker(self) -> None:
        """Shut down the worker process."""
        if self._stdout_task is not None:
            self._stdout_task.cancel()
            try:
                await self._stdout_task
            except asyncio.CancelledError:
                pass
        if self._stderr_task is not None:
            self._stderr_task.cancel()
            try:
                await self._stderr_task
            except asyncio.CancelledError:
                pass
        if self._writer is not None:
            self._writer.close()
            try:
                await self._writer.wait_closed()
            except Exception:
                pass
        if self._process is not None and self._process.returncode is None:
            self._process.terminate()
            try:
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self._process.kill()
                await self._process.wait()

    async def initialize(self) -> bool:
        """Pre-initialize the hardware monitor in the worker process.

        This starts the worker and asks it to initialize HardwareMonitor.
        API requests that arrive during initialization will get a quick
        "not available" response from ``is_available()`` instead of blocking.
        """
        logger.info("LibreHardwareSensor.initialize() starting")
        if not await self._ensure_worker():
            logger.error("LibreHardwareSensor.initialize() worker start failed")
            return False

        try:
            response = await self._send_command({"cmd": "init"}, timeout=120.0)
            self._connection_tested = True
            self.is_active = response.get("active", False)
            if not self.is_active:
                logger.error("LibreHardwareSensor.initialize() failed")
            else:
                logger.info("LibreHardwareSensor.initialize() successful")
            return self.is_active
        except Exception as e:
            logger.error(f"LibreHardwareSensor.initialize() error: {e}")
            self._connection_tested = True
            self.is_active = False
            await self._terminate_worker()
            return False

    async def is_available(self) -> bool:
        """Return the cached availability result.

        The worker is responsible for initialization; if it is not finished yet
        this returns False quickly so the API endpoint remains responsive.
        """
        if self._connection_tested and self.is_active and self._process is not None:
            if self._process.returncode is not None:
                logger.warning(
                    "LibreHardware worker has exited unexpectedly "
                    f"(returncode={self._process.returncode}); marking source inactive"
                )
                self.is_active = False
        available = self._connection_tested and bool(self.is_active)
        logger.info(
            f"LibreHardwareSensor.is_available() called, "
            f"tested={self._connection_tested}, active={self.is_active}, "
            f"returning={available}"
        )
        return available

    async def get_available_sensors(self) -> list[SensorData]:
        if not await self.is_available():
            return []
        try:
            response = await self._send_command(
                {"cmd": "get_available_sensors"}, timeout=30.0
            )
            sensors = response.get("sensors", [])
            return [SensorData.model_validate(s) for s in sensors]
        except Exception as e:
            logger.error(f"Error getting available sensors: {e}")
            return []

    async def get_current_data(self) -> dict[str, SensorData]:
        if not await self.is_available():
            return {}
        try:
            response = await self._send_command(
                {"cmd": "get_current_data"}, timeout=30.0
            )
            sensors = response.get("sensors", {})
            return {
                sensor_id: SensorData.model_validate(data)
                for sensor_id, data in sensors.items()
            }
        except Exception as e:
            logger.error(f"Error getting current sensor data: {e}")
            return {}

    async def get_hardware_tree(self) -> list[ApiHardwareNode]:
        if not await self.is_available():
            return []
        try:
            response = await self._send_command(
                {"cmd": "get_hardware_tree"}, timeout=30.0
            )
            hardware = response.get("hardware", [])
            return [ApiHardwareNode.model_validate(node) for node in hardware]
        except Exception as e:
            logger.error(f"Error getting hardware tree: {e}")
            return []

    async def close(self) -> None:
        """Clean up the worker process and HardwareMonitor resources."""
        try:
            if self._process is not None and self._process.returncode is None:
                try:
                    await self._send_command({"cmd": "close"}, timeout=10.0)
                except Exception as e:
                    logger.warning(f"Error sending close command to worker: {e}")
        finally:
            await self._terminate_worker()
