"""Pydantic response schemas for API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from ..models import ApiHardwareNode, DashboardPreset, SensorData, WidgetGroup


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


class ErrorResponse(BaseModel):
    """Structured error response."""

    error: str = Field(..., description="Error type or short code")
    message: str = Field(..., description="Human-readable error message")
    details: dict[str, Any] | None = Field(None, description="Additional error context")


class SensorSourceResponse(BaseModel):
    """Sensor source with available sensors."""

    id: str
    name: str
    active: bool
    sensors: list[SensorData] | dict[str, SensorData]
    last_update: str | None = None
    error_message: str | None = None


class SensorsResponse(BaseModel):
    """Response for /api/sensors."""

    sources: dict[str, SensorSourceResponse]


class SensorDataResponse(BaseModel):
    """Response for /api/sensors/current."""

    timestamp: str
    sources: dict[str, SensorSourceResponse]


class HardwareTreeResponse(BaseModel):
    """Response for /api/sensors/hardware-tree."""

    success: bool
    timestamp: str
    hardware: list[ApiHardwareNode]
    error: str | None = None


class PresetListResponse(BaseModel):
    """Response listing saved preset IDs."""

    presets: list[str]


class PresetResponse(DashboardPreset):
    """Full preset response."""

    pass


class PresetSaveResponse(BaseModel):
    """Response after saving a preset."""

    message: str
    id: str


class WidgetGroupListResponse(BaseModel):
    """Response listing saved widget group IDs."""

    groups: list[str]


class WidgetGroupResponse(WidgetGroup):
    """Full widget group response."""

    pass


class WidgetGroupSaveResponse(BaseModel):
    """Response after saving a widget group."""

    message: str
    id: str


class DebugSensorSource(BaseModel):
    """Debug information for a single sensor source."""

    name: str
    active: bool
    sensor_count: int | None = None
    sensors: dict[str, SensorData] | None = None
    error: str | None = None


class DebugSensorsResponse(BaseModel):
    """Response for /api/debug/sensors."""

    sensor_sources: dict[str, DebugSensorSource]
    total_sensors: int
    categories: dict[str, int]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    timestamp: str
    version: str


class ReadyResponse(BaseModel):
    """Readiness check response."""

    status: str
    available_sources: list[str]
