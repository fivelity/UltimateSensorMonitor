"""LibreHardwareMonitor sensor worker process.

This module runs in a dedicated subprocess so the blocking HardwareMonitor/
pythonnet calls (especially ``OpenComputer``) do not hold the GIL in the main
FastAPI process. The worker communicates with the parent process over a TCP
socket on localhost using newline-delimited JSON messages.
"""

from __future__ import annotations

import argparse
import json
import logging
import socket
import sys
from datetime import datetime
from typing import Any

from app.models import ApiHardwareNode, SensorData
from app.sensors.utils import generate_sensor_id, map_sensor_type

logger = logging.getLogger(__name__)

try:
    from HardwareMonitor.Util import OpenComputer

    HARDWARE_MONITOR_AVAILABLE = True
    logger.info("HardwareMonitor package loaded successfully")
except ImportError as e:
    logger.error(f"HardwareMonitor package not available: {e}")
    HARDWARE_MONITOR_AVAILABLE = False


class LibreHardwareSensorSync:
    """Synchronous sensor implementation used only inside the worker process."""

    def __init__(self) -> None:
        self.source_name = "LibreHardwareMonitor"
        self.computer: Any | None = None
        self.is_active: bool | None = None
        self._connection_tested = False

    def _initialize(self) -> bool:
        """Initialize HardwareMonitor and the Computer object."""
        if not HARDWARE_MONITOR_AVAILABLE:
            logger.error("HardwareMonitor package is not available")
            return False

        try:
            self.computer = OpenComputer(
                motherboard=True,
                cpu=True,
                gpu=True,
                memory=True,
                storage=True,
                network=True,
                controller=True,
                battery=True,
            )
            logger.info(
                "HardwareMonitor initialized successfully with all components enabled"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to initialize HardwareMonitor: {e}")
            return False

    def _test_connection(self) -> bool:
        """Test if the HardwareMonitor can be initialized."""
        if self._connection_tested:
            return bool(self.is_active)

        logger.info("Testing HardwareMonitor connection...")
        self.is_active = self._initialize()
        self._connection_tested = True

        if self.is_active:
            logger.info("HardwareMonitor connection successful")
        else:
            logger.error("HardwareMonitor connection failed")

        return bool(self.is_active)

    def _process_hardware_sensors(
        self, hardware: Any, sensors: dict[str, SensorData], parent_path: str
    ) -> None:
        """Process sensors from a hardware object."""
        try:
            hardware_name = str(hardware.Name)
            current_path = (
                f"{parent_path}/{hardware_name}" if parent_path else hardware_name
            )

            for sensor in hardware.Sensors:
                try:
                    sensor_name = str(sensor.Name)
                    sensor_value = sensor.Value

                    if sensor_value is None:
                        continue

                    try:
                        value = float(sensor_value)
                    except (ValueError, TypeError):
                        continue

                    category, unit = map_sensor_type(sensor.SensorType)
                    sensor_id = generate_sensor_id(hardware, sensor)
                    min_value = float(sensor.Min) if sensor.Min is not None else None
                    max_value = float(sensor.Max) if sensor.Max is not None else None

                    sensors[sensor_id] = SensorData(
                        id=sensor_id,
                        name=sensor_name,
                        value=value,
                        unit=unit,
                        category=category,
                        source=self.source_name,
                        min_value=min_value,
                        max_value=max_value,
                        parent=current_path,
                        timestamp=datetime.now(),
                    )
                except Exception as e:
                    logger.debug(f"Failed to process sensor {sensor.Name}: {e}")
        except Exception as e:
            logger.error(f"Error processing hardware sensors: {e}")

    def _collect_sensor_data_sync(self) -> dict[str, SensorData]:
        """Collect sensor data synchronously from the underlying library."""
        sensors: dict[str, SensorData] = {}

        if not self.computer:
            return sensors

        try:
            self.computer.Update()
            for hardware in self.computer.Hardware:
                self._process_hardware_sensors(hardware, sensors, "")
                for subhardware in hardware.SubHardware:
                    self._process_hardware_sensors(
                        subhardware, sensors, str(hardware.Name)
                    )
        except Exception as e:
            logger.error(f"Error collecting sensor data from {self.source_name}: {e}")

        return sensors

    def _build_hardware_node(
        self, hardware: Any, include_sub_hardware: bool = True
    ) -> ApiHardwareNode:
        """Build an ApiHardwareNode from a hardware object."""
        node = ApiHardwareNode(
            id=generate_sensor_id(hardware, hardware),
            name=str(hardware.Name),
            type=str(hardware.HardwareType),
            sensors=[],
            sub_hardware=[],
        )

        for sensor in hardware.Sensors:
            if sensor.Value is not None:
                try:
                    category, unit = map_sensor_type(sensor.SensorType)
                    node.sensors.append(
                        SensorData(
                            id=generate_sensor_id(hardware, sensor),
                            name=str(sensor.Name),
                            value=float(sensor.Value),
                            unit=unit,
                            category=category,
                            source=self.source_name,
                            min_value=(
                                float(sensor.Min) if sensor.Min is not None else None
                            ),
                            max_value=(
                                float(sensor.Max) if sensor.Max is not None else None
                            ),
                        )
                    )
                except Exception:
                    pass

        if include_sub_hardware and hasattr(hardware, "SubHardware"):
            for subhardware in hardware.SubHardware:
                node.sub_hardware.append(
                    self._build_hardware_node(subhardware, include_sub_hardware=False)
                )

        return node

    def _build_hardware_tree_sync(self) -> list[ApiHardwareNode]:
        """Build the hardware tree recursively."""
        if not self.computer:
            return []

        tree: list[ApiHardwareNode] = []
        try:
            self.computer.Update()
            for hardware in self.computer.Hardware:
                tree.append(
                    self._build_hardware_node(hardware, include_sub_hardware=True)
                )
        except Exception as e:
            logger.error(f"Error getting hardware tree: {e}")

        return tree

    def close(self) -> None:
        """Clean up HardwareMonitor resources."""
        try:
            if self.computer:
                logger.info("Closing HardwareMonitor...")
                self.computer.Close()
                self.computer = None
                logger.info("HardwareMonitor closed successfully")
        except Exception as e:
            logger.error(f"Error closing HardwareMonitor: {e}")


def _handle_command(
    sensor: LibreHardwareSensorSync, cmd: dict[str, Any]
) -> dict[str, Any]:
    """Execute a single worker command and return a response dict."""
    action = cmd.get("cmd")
    try:
        if action == "init":
            result = sensor._test_connection()
            return {
                "success": True,
                "active": result,
                "tested": sensor._connection_tested,
            }
        if action == "get_available_sensors":
            data = sensor._collect_sensor_data_sync()
            return {
                "success": True,
                "sensors": [s.model_dump(mode="json") for s in data.values()],
            }
        if action == "get_current_data":
            data = sensor._collect_sensor_data_sync()
            return {
                "success": True,
                "sensors": {k: v.model_dump(mode="json") for k, v in data.items()},
            }
        if action == "get_hardware_tree":
            data = sensor._build_hardware_tree_sync()
            return {
                "success": True,
                "hardware": [n.model_dump(mode="json") for n in data],
            }
        if action == "close":
            sensor.close()
            return {"success": True}
        return {"success": False, "error": f"Unknown command: {action}"}
    except Exception as e:
        logger.exception("Worker command failed")
        return {"success": False, "error": str(e)}


def _write_port(port: int, port_file: str) -> None:
    """Write the chosen port to the file so the parent can connect."""
    with open(port_file, "w", encoding="utf-8") as f:
        f.write(str(port))


def _run_worker(port_file: str) -> None:
    """Run the worker: open a socket, accept one connection, and serve commands."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    port = server.getsockname()[1]
    logger.info(f"Worker listening on 127.0.0.1:{port}")

    _write_port(port, port_file)

    conn, addr = server.accept()
    logger.info(f"Parent connected from {addr}")
    conn_file = conn.makefile("r", encoding="utf-8")
    sensor = LibreHardwareSensorSync()

    try:
        for line in conn_file:
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON command: {e}")
                continue

            response = _handle_command(sensor, cmd)
            conn.sendall((json.dumps(response) + "\n").encode("utf-8"))

            if cmd.get("cmd") == "close":
                break
    finally:
        sensor.close()
        conn_file.close()
        conn.close()
        server.close()


def main() -> None:
    """Parse arguments and start the worker."""
    parser = argparse.ArgumentParser(description="LibreHardwareMonitor worker")
    parser.add_argument(
        "--port-file", required=True, help="File to write the chosen port"
    )
    args = parser.parse_args()
    _run_worker(args.port_file)


if __name__ == "__main__":
    main()
