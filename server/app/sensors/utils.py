"""Shared utilities for sensor implementations."""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


# Mapping from LibreHardwareMonitor/HardwareMonitor sensor type names to
# (category, unit) tuples.
SENSOR_TYPE_MAPPING = {
    "Voltage": ("voltage", "V"),
    "Clock": ("clock", "MHz"),
    "Temperature": ("temperature", "°C"),
    "Load": ("load", "%"),
    "Fan": ("fan", "RPM"),
    "Flow": ("flow", "L/h"),
    "Control": ("control", "%"),
    "Level": ("level", "%"),
    "Factor": ("factor", ""),
    "Power": ("power", "W"),
    "Data": ("data", "GB"),
    "SmallData": ("data", "MB"),
    "Throughput": ("throughput", "B/s"),
    "TimeSpan": ("time", "s"),
    "Energy": ("energy", "mWh"),
    "Noise": ("noise", "dBA"),
}


def map_sensor_type(sensor_type) -> tuple[str, str]:
    """Map a sensor type enum to (category, unit)."""
    try:
        return SENSOR_TYPE_MAPPING.get(str(sensor_type), ("unknown", ""))
    except Exception as e:
        logger.debug(f"Error mapping sensor type: {e}")
        return ("unknown", "")


def generate_sensor_id(hardware, sensor) -> str:
    """Generate a stable sensor ID from hardware and sensor identifiers."""
    try:
        hardware_id = str(hardware.Identifier).replace("/", "_").replace(" ", "_")
        sensor_id = str(sensor.Identifier).replace("/", "_").replace(" ", "_")
        hardware_id = re.sub(r"[^\w_]", "", hardware_id.lower())
        sensor_id = re.sub(r"[^\w_]", "", sensor_id.lower())
        return f"{hardware_id}_{sensor_id}"
    except Exception as e:
        logger.debug(f"Error generating sensor ID: {e}")
        return f"{hardware.Name}_{sensor.Name}".replace(" ", "_").lower()
