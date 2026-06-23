"""Application-specific exceptions for Ultimate Sensor Monitor."""


class AppError(Exception):
    """Base application error."""

    status_code: int = 500
    detail: str = "Internal server error"


class PresetNotFoundError(AppError):
    """Raised when a requested dashboard preset cannot be found."""

    status_code = 404

    def __init__(self, preset_id: str):
        self.detail = f"Preset '{preset_id}' not found"
        self.preset_id = preset_id


class WidgetGroupNotFoundError(AppError):
    """Raised when a requested widget group cannot be found."""

    status_code = 404

    def __init__(self, group_id: str):
        self.detail = f"Widget group '{group_id}' not found"
        self.group_id = group_id


class SensorUnavailableError(AppError):
    """Raised when a sensor source is unavailable or fails."""

    status_code = 503

    def __init__(self, source_name: str, reason: str = "Sensor source unavailable"):
        self.detail = f"{source_name}: {reason}"
        self.source_name = source_name
