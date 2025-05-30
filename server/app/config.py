"""
Configuration settings for Ultimate Sensor Monitor Reimagined backend.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings."""
    
    # Server settings
    app_name: str = "Ultimate Sensor Monitor Reimagined"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8100
    
    # CORS settings
    cors_origins: List[str] = [
        "http://localhost:5501",  # SvelteKit dev server (new port)
        "http://localhost:5173",  # SvelteKit dev server (old port)
        "http://localhost:4173",  # SvelteKit preview server
        "http://localhost:3000",  # Alternative dev port
    ]
    
    # WebSocket settings
    sensor_update_interval: float = 2.0  # seconds (slightly slower for better performance)
    max_websocket_connections: int = 100
    
    # Data settings
    data_directory: str = "data"
    max_preset_size: int = 10 * 1024 * 1024  # 10MB
    
    # Sensor settings
    mock_sensor_enabled: bool = True
    aida64_enabled: bool = False
    libre_hardware_monitor_enabled: bool = True  # Enable LibreHardwareMonitor by default
    hwinfo_enabled: bool = False
    
    class Config:
        env_prefix = "ULTIMON_"
        env_file = ".env"


# Global settings instance
settings = Settings() 