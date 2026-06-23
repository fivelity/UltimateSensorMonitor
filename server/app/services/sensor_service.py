"""Sensor orchestration service."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import TypedDict

from ..models import ApiHardwareNode, SensorData
from ..sensors.base import BaseSensor
from ..schemas.responses import (
    DebugSensorSource,
    DebugSensorsResponse,
    HardwareTreeResponse,
    SensorDataResponse,
    SensorSourceResponse,
    SensorsResponse,
)

logger = logging.getLogger(__name__)


class SensorSourceTuple(TypedDict):
    """Typed tuple describing a registered sensor source."""

    id: str
    name: str
    instance: BaseSensor


class SensorService:
    """Orchestrates all registered sensor sources."""

    def __init__(self, sources: list[tuple[str, str, BaseSensor]]):
        self._sources = sources

    async def get_available_sensors(self) -> SensorsResponse:
        """Return metadata for all available sensors from each source."""
        result: dict[str, SensorSourceResponse] = {}

        for source_id, source_name, sensor in self._sources:
            try:
                available = await sensor.is_available()
                if not available:
                    result[source_id] = SensorSourceResponse(
                        id=source_id,
                        name=source_name,
                        active=False,
                        sensors=[],
                        error_message="Sensor source not available",
                    )
                    continue

                sensors = await sensor.get_available_sensors()
                result[source_id] = SensorSourceResponse(
                    id=source_id,
                    name=source_name,
                    active=True,
                    sensors=sensors,
                    last_update=datetime.now().isoformat(),
                )
            except Exception as e:
                logger.error(f"Failed to get sensors from {source_name}: {e}")
                result[source_id] = SensorSourceResponse(
                    id=source_id,
                    name=source_name,
                    active=False,
                    sensors=[],
                    error_message=f"Error getting sensors: {e}",
                )

        return SensorsResponse(sources=result)

    async def get_current_data(self) -> SensorDataResponse:
        """Return current readings from all active sources."""
        all_data: dict[str, SensorSourceResponse] = {}

        for source_id, source_name, sensor in self._sources:
            try:
                available = await sensor.is_available()
                if not available:
                    all_data[source_id] = SensorSourceResponse(
                        id=source_id,
                        name=source_name,
                        active=False,
                        sensors={},
                    )
                    continue

                data = await sensor.get_current_data()
                all_data[source_id] = SensorSourceResponse(
                    id=source_id,
                    name=source_name,
                    active=True,
                    sensors=data,
                    last_update=datetime.now().isoformat(),
                )
            except Exception as e:
                logger.error(f"Failed to get data from {source_name}: {e}")
                all_data[source_id] = SensorSourceResponse(
                    id=source_id,
                    name=source_name,
                    active=False,
                    sensors={},
                    error_message=f"Error getting data: {e}",
                )

        return SensorDataResponse(
            timestamp=datetime.now().isoformat(),
            sources=all_data,
        )

    async def get_hardware_tree(self) -> HardwareTreeResponse:
        """Return the hardware tree from the updated LibreHardware source."""
        for source_id, source_name, sensor in self._sources:
            if source_id != "librehardware_updated":
                continue

            try:
                available = await sensor.is_available()
                if not available:
                    return HardwareTreeResponse(
                        success=False,
                        timestamp=datetime.now().isoformat(),
                        hardware=[],
                        error=f"{source_name} is not available",
                    )

                tree = await sensor.get_hardware_tree()
                return HardwareTreeResponse(
                    success=True,
                    timestamp=datetime.now().isoformat(),
                    hardware=tree,
                )
            except Exception as e:
                logger.error(f"Failed to get hardware tree: {e}")
                return HardwareTreeResponse(
                    success=False,
                    timestamp=datetime.now().isoformat(),
                    hardware=[],
                    error=str(e),
                )

        return HardwareTreeResponse(
            success=False,
            timestamp=datetime.now().isoformat(),
            hardware=[],
            error="LibreHardwareMonitor (Updated) is not configured",
        )

    async def get_debug_info(self) -> DebugSensorsResponse:
        """Return detailed debug information for all sources."""
        debug_info = DebugSensorsResponse(
            sensor_sources={},
            total_sensors=0,
            categories={},
        )

        for source_id, source_name, sensor in self._sources:
            try:
                available = await sensor.is_available()
                if not available:
                    debug_info.sensor_sources[source_id] = DebugSensorSource(
                        name=source_name,
                        active=False,
                        error="Source not available",
                    )
                    continue

                data = await sensor.get_current_data()
                sensor_count = len(data)
                debug_info.sensor_sources[source_id] = DebugSensorSource(
                    name=source_name,
                    active=True,
                    sensor_count=sensor_count,
                    sensors=data,
                )
                debug_info.total_sensors += sensor_count

                for reading in data.values():
                    category = reading.category if isinstance(reading, SensorData) else reading.get("category", "unknown")
                    debug_info.categories[category] = debug_info.categories.get(category, 0) + 1
            except Exception as e:
                debug_info.sensor_sources[source_id] = DebugSensorSource(
                    name=source_name,
                    active=False,
                    error=str(e),
                )

        return debug_info

    async def get_available_source_names(self) -> list[str]:
        """Return the names of sources that are currently available."""
        names: list[str] = []
        for _, source_name, sensor in self._sources:
            try:
                if await sensor.is_available():
                    names.append(source_name)
            except Exception:
                pass
        return names
