"""
LibreHardwareMonitor sensor integration using the HardwareMonitor Python package.
Provides a cleaner interface to LibreHardwareMonitor via the HardwareMonitor PyPI package.
"""

from __future__ import annotations

import asyncio
import logging
import time
from abc import abstractmethod
from datetime import datetime

from .base import BaseSensor
from .utils import generate_sensor_id, map_sensor_type
from ..models import ApiHardwareNode, SensorData

logger = logging.getLogger(__name__)

try:
    from HardwareMonitor.Util import OpenComputer
    HARDWARE_MONITOR_AVAILABLE = True
    logger.info("HardwareMonitor package loaded successfully")
except ImportError as e:
    logger.error(f"HardwareMonitor package not available: {e}")
    HARDWARE_MONITOR_AVAILABLE = False


class LibreHardwareSensor(BaseSensor):
    """Sensor implementation for LibreHardwareMonitor using the HardwareMonitor package."""

    def __init__(self):
        super().__init__("LibreHardwareMonitor")
        self.computer = None
        self.is_active: bool | None = None
        self._connection_tested = False
        self._connection_lock = asyncio.Lock()
        self.cached_data: dict[str, SensorData] = {}
        self.cache_duration = 1.0
        self.last_update: float | None = None

    def _initialize(self) -> bool:
        """Initialize HardwareMonitor and Computer object."""
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
            logger.info("HardwareMonitor initialized successfully with all components enabled")
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

    def _process_hardware_sensors(self, hardware, sensors: dict[str, SensorData], parent_path: str) -> None:
        """Process sensors from a hardware object."""
        try:
            hardware_name = str(hardware.Name)
            current_path = f"{parent_path}/{hardware_name}" if parent_path else hardware_name

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
                    self._process_hardware_sensors(subhardware, sensors, str(hardware.Name))
        except Exception as e:
            logger.error(f"Error collecting sensor data from {self.source_name}: {e}")

        return sensors

    async def _collect_sensor_data(self) -> dict[str, SensorData]:
        """Collect sensor data asynchronously with caching."""
        if (
            self.last_update
            and time.time() - self.last_update < self.cache_duration
            and self.cached_data
        ):
            return self.cached_data

        try:
            sensors = await asyncio.to_thread(self._collect_sensor_data_sync)
            self.cached_data = sensors
            self.last_update = time.time()
            return sensors
        except Exception as e:
            logger.error(f"Error in async sensor data collection: {e}")
            return {}

    async def is_available(self) -> bool:
        async with self._connection_lock:
            return await asyncio.to_thread(self._test_connection)

    async def get_available_sensors(self) -> list[SensorData]:
        if not await self.is_available():
            return []
        sensors_data = await self._collect_sensor_data()
        return list(sensors_data.values())

    async def get_current_data(self) -> dict[str, SensorData]:
        if not await self.is_available():
            return {}
        return await self._collect_sensor_data()

    def _build_hardware_node(self, hardware, include_sub_hardware: bool = True) -> ApiHardwareNode:
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
                            min_value=float(sensor.Min) if sensor.Min is not None else None,
                            max_value=float(sensor.Max) if sensor.Max is not None else None,
                        )
                    )
                except Exception:
                    pass

        if include_sub_hardware and hasattr(hardware, "SubHardware"):
            for subhardware in hardware.SubHardware:
                node.sub_hardware.append(self._build_hardware_node(subhardware, include_sub_hardware=False))

        return node

    def _build_hardware_tree_sync(self) -> list[ApiHardwareNode]:
        """Build the hardware tree recursively."""
        if not self.computer:
            return []

        tree: list[ApiHardwareNode] = []
        try:
            self.computer.Update()
            for hardware in self.computer.Hardware:
                tree.append(self._build_hardware_node(hardware, include_sub_hardware=True))
        except Exception as e:
            logger.error(f"Error getting hardware tree: {e}")

        return tree

    async def get_hardware_tree(self) -> list[ApiHardwareNode]:
        """Get hierarchical view of all hardware and sensors."""
        if not await self.is_available():
            return []
        return await asyncio.to_thread(self._build_hardware_tree_sync)

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

    def __del__(self) -> None:
        """Destructor to ensure cleanup."""
        self.close()
