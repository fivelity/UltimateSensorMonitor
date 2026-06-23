"""Abstract base classes for sensor data sources."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod


class BaseSensor(ABC):
    """Abstract base class for all sensor data sources.

    All public methods are async so that the orchestration layer does not need
    runtime introspection to decide whether to await a call.
    """

    def __init__(self, source_name: str = "Unknown"):
        self.source_name = source_name
        self.is_active = False
        self.last_error: Exception | None = None

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True if the sensor source can be used."""
        ...

    @abstractmethod
    async def get_available_sensors(self) -> list[SensorData]:
        """Return a list of sensor metadata objects."""
        ...

    @abstractmethod
    async def get_current_data(self) -> dict[str, SensorData]:
        """Return current readings keyed by sensor ID."""
        ...

    def get_source_info(self) -> dict[str, str | bool | None]:
        """Return a summary of this source."""
        return {
            "name": self.source_name,
            "active": self.is_active,
            "last_error": str(self.last_error) if self.last_error else None,
        }


class SyncSensorBase(BaseSensor, ABC):
    """Helper base for sensors that perform synchronous I/O.

    Subclasses implement the synchronous `_sync_*` hooks; this class wraps them
    in ``asyncio.to_thread()`` so they expose the same async interface as
    naturally async sensors.
    """

    @abstractmethod
    def _sync_is_available(self) -> bool:
        """Return True if the sensor source can be used."""
        ...

    @abstractmethod
    def _sync_get_available_sensors(self) -> list[SensorData]:
        """Return a list of sensor metadata objects."""
        ...

    @abstractmethod
    def _sync_get_current_data(self) -> dict[str, SensorData]:
        """Return current readings keyed by sensor ID."""
        ...

    async def is_available(self) -> bool:
        return await asyncio.to_thread(self._sync_is_available)

    async def get_available_sensors(self) -> list[SensorData]:
        return await asyncio.to_thread(self._sync_get_available_sensors)

    async def get_current_data(self) -> dict[str, SensorData]:
        return await asyncio.to_thread(self._sync_get_current_data)
