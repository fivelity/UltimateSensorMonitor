"""
Abstract base class for sensor data sources.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from ..models import SensorData


class BaseSensor(ABC):
    """Abstract base class for all sensor data sources."""
    
    def __init__(self, source_name: str = "Unknown"):
        self.source_name = source_name
        self.is_active = False
        self.last_error = None
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the sensor source is available.
        Returns True if available, False otherwise.
        """
        pass
    
    @abstractmethod
    def get_available_sensors(self) -> List[Dict[str, Any]]:
        """
        Get list of available sensors from this source.
        Returns list of sensor dictionaries.
        """
        pass
    
    @abstractmethod
    def get_current_data(self) -> Dict[str, Any]:
        """
        Get current sensor readings.
        Returns dictionary with sensor data.
        """
        pass
    
    def get_sensor_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        """Get specific sensor data by ID."""
        sensors = self.get_available_sensors()
        for sensor in sensors:
            if sensor.get("id") == sensor_id:
                return sensor
        return None
    
    def get_sensors_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get sensors filtered by category."""
        sensors = self.get_available_sensors()
        return [sensor for sensor in sensors if sensor.get("category") == category]
    
    def get_source_info(self) -> Dict[str, Any]:
        """Get information about this sensor source."""
        return {
            "name": self.source_name,
            "active": self.is_active,
            "last_error": self.last_error
        } 