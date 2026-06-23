"""
HWiNFO64 sensor integration.
Reads hardware data from HWiNFO64's shared memory interface.
"""

from __future__ import annotations

import ctypes
import logging
import struct
import time
from datetime import datetime

from .base import SyncSensorBase
from ..models import SensorData

logger = logging.getLogger(__name__)

try:
    import mmap  # noqa: F401
    from ctypes import wintypes  # noqa: F401
    MMAP_AVAILABLE = True
except ImportError:
    MMAP_AVAILABLE = False
    logger.warning("Memory mapping not available - HWiNFO64 integration disabled")


class HWiNFOSensor(SyncSensorBase):
    """Sensor implementation for HWiNFO64 shared memory."""

    HWINFO_SHARED_MEM_FILE_PREFIX = "Global\\HWiNFO_SENS_SM2"
    HWINFO_SENSORS_STRING_LEN = 128
    HWINFO_UNIT_STRING_LEN = 16

    def __init__(self):
        super().__init__("HWiNFO64")
        self.is_active = False
        self.last_update: float | None = None
        self.cached_data: dict[str, SensorData] = {}
        self.cache_duration = 1.0
        self.shared_mem_handle = None

        if MMAP_AVAILABLE:
            self._check_availability()

    def _check_availability(self) -> None:
        """Check if HWiNFO64 shared memory is available."""
        if not MMAP_AVAILABLE:
            return

        try:
            kernel32 = ctypes.windll.kernel32
            handle = kernel32.OpenFileMappingW(
                0x0004,  # FILE_MAP_READ
                False,
                self.HWINFO_SHARED_MEM_FILE_PREFIX,
            )

            if handle:
                self.shared_mem_handle = handle
                self.is_active = True
                logger.info("HWiNFO64 shared memory interface detected")
            else:
                logger.warning("HWiNFO64 shared memory not available")
        except Exception as e:
            logger.warning(f"Failed to check HWiNFO64 availability: {e}")

    def _read_shared_memory(self) -> bytes | None:
        """Read data from HWiNFO64 shared memory."""
        if not self.shared_mem_handle:
            return None

        try:
            kernel32 = ctypes.windll.kernel32
            mapped_memory = kernel32.MapViewOfFile(
                self.shared_mem_handle,
                0x0004,  # FILE_MAP_READ
                0, 0, 0,
            )

            if not mapped_memory:
                return None

            header_size = 16
            header = ctypes.string_at(mapped_memory, header_size)
            total_size = struct.unpack("<L", header[8:12])[0] if len(header) >= 12 else 4096

            data = ctypes.string_at(mapped_memory, min(total_size, 65536))
            kernel32.UnmapViewOfFile(mapped_memory)
            return data
        except Exception as e:
            logger.error(f"Failed to read HWiNFO64 shared memory: {e}")
            return None

    def _parse_hwinfo_data(self, data: bytes) -> dict[str, SensorData]:
        """Parse HWiNFO64 shared memory data into sensor readings."""
        sensors: dict[str, SensorData] = {}

        if not data or len(data) < 32:
            return sensors

        offset = 16
        sensor_count = 0

        while offset < len(data) - 200 and sensor_count < 200:
            try:
                if offset + 200 > len(data):
                    break

                name_bytes = data[offset:offset + self.HWINFO_SENSORS_STRING_LEN]
                name = name_bytes.decode("utf-8", errors="ignore").rstrip("\x00")
                offset += self.HWINFO_SENSORS_STRING_LEN

                if not name:
                    offset += 72
                    continue

                unit_bytes = data[offset:offset + self.HWINFO_UNIT_STRING_LEN]
                unit = unit_bytes.decode("utf-8", errors="ignore").rstrip("\x00")
                offset += self.HWINFO_UNIT_STRING_LEN

                value = struct.unpack("<f", data[offset:offset + 4])[0]
                offset += 4

                min_val, max_val = struct.unpack("<ff", data[offset:offset + 8])
                offset += 8

                offset += 40

                sensor_id = self._generate_sensor_id(name)
                category = self._determine_category(name, unit)

                sensors[sensor_id] = SensorData(
                    id=sensor_id,
                    name=name,
                    value=value,
                    unit=unit,
                    min_value=min_val if min_val != 0 else None,
                    max_value=max_val if max_val != 0 else None,
                    source=self.source_name,
                    category=category,
                    timestamp=datetime.now(),
                )
                sensor_count += 1

            except (struct.error, UnicodeDecodeError, IndexError) as e:
                logger.debug(f"Error parsing sensor at offset {offset}: {e}")
                offset += 200
                continue

        return sensors

    def _generate_sensor_id(self, name: str) -> str:
        """Generate a unique sensor ID from name."""
        return "".join(c.lower() if c.isalnum() else "_" for c in name)

    def _determine_category(self, name: str, unit: str) -> str:
        """Determine sensor category from name and unit."""
        name_lower = name.lower()
        unit_lower = unit.lower()

        if "°c" in unit_lower or "temp" in name_lower:
            return "temperature"
        if "%" in unit and ("usage" in name_lower or "load" in name_lower or "util" in name_lower):
            return "usage"
        if "rpm" in unit_lower or "fan" in name_lower:
            return "fan"
        if "w" == unit_lower or "power" in name_lower:
            return "power"
        if "v" == unit_lower or "volt" in name_lower:
            return "voltage"
        if "mhz" in unit_lower or "ghz" in unit_lower or "clock" in name_lower or "freq" in name_lower:
            return "frequency"
        if "mb" in unit_lower or "gb" in unit_lower or "memory" in name_lower:
            return "memory"
        return "other"

    def _sync_is_available(self) -> bool:
        """Return True if the HWiNFO64 shared memory interface is available."""
        return self.is_active and MMAP_AVAILABLE

    def _sync_get_available_sensors(self) -> list[SensorData]:
        """Return cached or fresh sensor metadata."""
        current_time = time.time()
        if (
            self.last_update
            and current_time - self.last_update < self.cache_duration
            and self.cached_data
        ):
            return list(self.cached_data.values())

        data = self._read_shared_memory()
        if data:
            sensor_data = self._parse_hwinfo_data(data)
            self.cached_data = sensor_data
            self.last_update = current_time
            return list(sensor_data.values())

        return []

    def _sync_get_current_data(self) -> dict[str, SensorData]:
        """Return current readings keyed by sensor ID."""
        sensors = self._sync_get_available_sensors()
        return {sensor.id: sensor for sensor in sensors}

    def refresh(self) -> bool:
        """Refresh sensor availability and data."""
        if MMAP_AVAILABLE:
            self._check_availability()
            if self.is_active:
                self.cached_data = {}
                self.last_update = None
        return self.is_active

    def __del__(self) -> None:
        """Cleanup shared memory handle."""
        if self.shared_mem_handle:
            try:
                ctypes.windll.kernel32.CloseHandle(self.shared_mem_handle)
            except Exception:
                pass
