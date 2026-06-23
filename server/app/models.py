"""
Pydantic models for Ultimate Sensor Monitor Reimagined.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class SensorData(BaseModel):
    """Model for individual sensor reading."""

    id: str = Field(..., description="Unique sensor identifier")
    name: str = Field(..., description="Human-readable sensor name")
    value: float | int | str = Field(..., description="Current sensor value")
    unit: str = Field(..., description="Unit of measurement")
    min_value: float | None = Field(None, description="Minimum expected value")
    max_value: float | None = Field(None, description="Maximum expected value")
    source: str = Field(..., description="Data source (e.g., 'mock', 'aida64')")
    category: str = Field(..., description="Sensor category (e.g., 'temperature', 'usage')")
    parent: str | None = Field(None, description="Parent hardware path (e.g., 'CPU/Intel Core i7')")
    timestamp: datetime | None = Field(None, description="Last update timestamp")


GAUGE_TYPES = {"text", "radial", "linear", "graph", "image", "glassmorphic"}


class WidgetConfig(BaseModel):
    """Configuration for a single widget."""

    id: str = Field(..., description="Unique widget identifier")
    sensor_id: str = Field(..., description="ID of the bound sensor")
    gauge_type: str = Field("text", description="Type of gauge (text, radial, linear, graph, image, glassmorphic)")

    # Position and size
    pos_x: float = Field(0, ge=0, description="X position on canvas")
    pos_y: float = Field(0, ge=0, description="Y position on canvas")
    width: float = Field(200, gt=0, description="Widget width")
    height: float = Field(100, gt=0, description="Widget height")
    rotation: float = Field(0, ge=0, lt=360, description="Widget rotation in degrees")
    z_index: int = Field(0, description="Z-index for layering")

    # Widget behavior
    is_locked: bool = Field(False, description="Whether widget is locked from editing")
    group_id: str | None = Field(None, description="Group ID if widget belongs to a group")

    # Display options
    show_label: bool = Field(True, description="Whether to show sensor label")
    custom_label: str | None = Field(None, description="Custom label text")
    show_unit: bool = Field(True, description="Whether to show unit")
    custom_unit: str | None = Field(None, description="Custom unit text")

    # Gauge-specific settings
    gauge_settings: dict[str, Any] = Field(default_factory=dict, description="Gauge-specific configuration")

    # Visual styling
    style_settings: dict[str, Any] = Field(default_factory=dict, description="Widget styling options")

    @field_validator("gauge_type")
    @classmethod
    def validate_gauge_type(cls, value: str) -> str:
        if value not in GAUGE_TYPES:
            raise ValueError(f"gauge_type must be one of {sorted(GAUGE_TYPES)}")
        return value


class WidgetGroup(BaseModel):
    """Model for widget groups."""

    id: str | None = Field(None, description="Unique group identifier")
    name: str = Field(..., description="Group name")
    description: str | None = Field(None, description="Group description")
    widgets: list[str] = Field(..., description="List of widget IDs in this group")
    relative_positions: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="Relative positions of widgets within group",
    )
    created_at: datetime | None = Field(None, description="Creation timestamp")


class VisualSettings(BaseModel):
    """Global visual environment settings."""

    # Core visual dimensions
    materiality: float = Field(0.5, ge=0, le=1, description="Materiality/depth level (0=flat, 1=glassmorphism)")
    information_density: float = Field(0.5, ge=0, le=1, description="Information density (0=sparse, 1=dense)")
    animation_level: float = Field(0.5, ge=0, le=1, description="Animation intensity (0=static, 1=dynamic)")

    # Color scheme
    color_scheme: str = Field("professional", description="Selected color scheme preset")
    custom_colors: dict[str, str] = Field(default_factory=dict, description="Custom color overrides")

    # Typography
    font_family: str = Field("sans-serif", description="Primary font family")
    font_scale: float = Field(1.0, ge=0.5, le=2.0, description="Font size scaling factor")

    # Effects
    enable_blur_effects: bool = Field(False, description="Enable backdrop blur effects")
    enable_animations: bool = Field(True, description="Enable CSS animations")
    reduce_motion: bool = Field(False, description="Reduce motion for accessibility")

    # Grid and layout
    grid_size: int = Field(5, ge=1, le=20, description="Micro-grid size in pixels")
    snap_to_grid: bool = Field(True, description="Enable grid snapping")
    show_grid: bool = Field(False, description="Show grid in edit mode")


class DashboardLayout(BaseModel):
    """Dashboard layout configuration."""

    canvas_width: int = Field(1920, gt=0, description="Canvas width in pixels")
    canvas_height: int = Field(1080, gt=0, description="Canvas height in pixels")
    background_type: str = Field("solid", description="Background type (solid, gradient, image)")
    background_settings: dict[str, Any] = Field(default_factory=dict, description="Background configuration")


class DashboardPreset(BaseModel):
    """Complete dashboard preset."""

    id: str | None = Field(default_factory=lambda: str(uuid4()), description="Unique preset identifier")
    name: str = Field(..., min_length=1, max_length=255, description="Preset name")
    description: str | None = Field(None, description="Preset description")

    # Dashboard content
    widgets: list[WidgetConfig] = Field(default_factory=list, description="Widget configurations")
    widget_groups: list[WidgetGroup] = Field(default_factory=list, description="Widget group definitions")

    # Visual configuration
    layout: DashboardLayout = Field(default_factory=DashboardLayout, description="Layout settings")
    visual_settings: VisualSettings = Field(default_factory=VisualSettings, description="Visual environment settings")

    # Metadata
    created_at: datetime | None = Field(None, description="Creation timestamp")
    updated_at: datetime | None = Field(None, description="Last update timestamp")
    version: str = Field("1.0", description="Preset format version")


class SensorSource(BaseModel):
    """Model for sensor data sources."""

    id: str = Field(..., description="Source identifier")
    name: str = Field(..., description="Human-readable source name")
    active: bool = Field(False, description="Whether source is currently active")
    sensors: list[SensorData] = Field(default_factory=list, description="Available sensors from this source")
    last_update: datetime | None = Field(None, description="Last successful update")
    error_message: str | None = Field(None, description="Last error message if any")


class ApiHardwareNode(BaseModel):
    """Hardware node as returned by the hardware-tree endpoint."""

    id: str = Field(..., description="Node identifier")
    name: str = Field(..., description="Human-readable node name")
    type: str | None = Field(None, description="Hardware type")
    sensors: list[SensorData] = Field(default_factory=list, description="Sensors attached to this node")
    sub_hardware: list["ApiHardwareNode"] = Field(default_factory=list, description="Child hardware nodes")


ApiHardwareNode.model_rebuild()
