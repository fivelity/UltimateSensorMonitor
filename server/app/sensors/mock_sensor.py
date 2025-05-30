"""
Mock sensor implementation for development and testing.
Generates realistic-looking hardware monitoring data.
"""

import random
import math
import time
from typing import Dict, List, Any
from datetime import datetime
from .base import BaseSensor
from ..models import SensorData


class MockSensor(BaseSensor):
    """Mock sensor data generator for development."""
    
    def __init__(self):
        super().__init__("Mock Sensor")
        self.is_active = True
        self.start_time = time.time()
        
        # Define mock sensors with realistic ranges
        self.sensor_definitions = [
            # CPU sensors
            {
                "id": "cpu_temp",
                "name": "CPU Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 30.0,
                "max_value": 85.0,
                "base_value": 45.0,
                "variation": 15.0
            },
            {
                "id": "cpu_usage",
                "name": "CPU Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 0.0,
                "max_value": 100.0,
                "base_value": 25.0,
                "variation": 35.0
            },
            {
                "id": "cpu_power",
                "name": "CPU Power",
                "unit": "W",
                "category": "power",
                "min_value": 15.0,
                "max_value": 125.0,
                "base_value": 45.0,
                "variation": 30.0
            },
            {
                "id": "cpu_clock",
                "name": "CPU Clock Speed",
                "unit": "MHz",
                "category": "frequency",
                "min_value": 800.0,
                "max_value": 4200.0,
                "base_value": 2400.0,
                "variation": 800.0
            },
            
            # GPU sensors
            {
                "id": "gpu_temp",
                "name": "GPU Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 35.0,
                "max_value": 83.0,
                "base_value": 50.0,
                "variation": 20.0
            },
            {
                "id": "gpu_usage",
                "name": "GPU Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 0.0,
                "max_value": 100.0,
                "base_value": 30.0,
                "variation": 40.0
            },
            {
                "id": "gpu_memory",
                "name": "GPU Memory Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 10.0,
                "max_value": 95.0,
                "base_value": 35.0,
                "variation": 25.0
            },
            {
                "id": "gpu_power",
                "name": "GPU Power",
                "unit": "W",
                "category": "power",
                "min_value": 20.0,
                "max_value": 250.0,
                "base_value": 80.0,
                "variation": 60.0
            },
            
            # Memory sensors
            {
                "id": "ram_usage",
                "name": "RAM Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 25.0,
                "max_value": 85.0,
                "base_value": 45.0,
                "variation": 15.0
            },
            {
                "id": "ram_temp",
                "name": "RAM Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 30.0,
                "max_value": 55.0,
                "base_value": 38.0,
                "variation": 8.0
            },
            
            # Storage sensors
            {
                "id": "nvme_temp",
                "name": "NVMe SSD Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 25.0,
                "max_value": 70.0,
                "base_value": 35.0,
                "variation": 12.0
            },
            {
                "id": "disk_usage",
                "name": "Disk Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 45.0,
                "max_value": 75.0,
                "base_value": 60.0,
                "variation": 5.0
            },
            
            # System sensors
            {
                "id": "motherboard_temp",
                "name": "Motherboard Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 28.0,
                "max_value": 50.0,
                "base_value": 35.0,
                "variation": 6.0
            },
            {
                "id": "psu_temp",
                "name": "PSU Temperature",
                "unit": "°C",
                "category": "temperature",
                "min_value": 30.0,
                "max_value": 65.0,
                "base_value": 42.0,
                "variation": 10.0
            },
            
            # Fan sensors
            {
                "id": "cpu_fan_speed",
                "name": "CPU Fan Speed",
                "unit": "RPM",
                "category": "fan",
                "min_value": 500.0,
                "max_value": 2000.0,
                "base_value": 1200.0,
                "variation": 400.0
            },
            {
                "id": "case_fan_speed",
                "name": "Case Fan Speed",
                "unit": "RPM",
                "category": "fan",
                "min_value": 300.0,
                "max_value": 1500.0,
                "base_value": 800.0,
                "variation": 300.0
            },
            
            # Network sensors
            {
                "id": "network_usage",
                "name": "Network Usage",
                "unit": "%",
                "category": "usage",
                "min_value": 0.0,
                "max_value": 100.0,
                "base_value": 15.0,
                "variation": 25.0
            }
        ]
    
    def is_available(self) -> bool:
        """Mock sensor is always available."""
        return True
    
    def get_available_sensors(self) -> List[Dict[str, Any]]:
        """Get list of all available mock sensors."""
        return [
            {
                "id": sensor["id"],
                "name": sensor["name"],
                "unit": sensor["unit"],
                "category": sensor["category"],
                "min_value": sensor["min_value"],
                "max_value": sensor["max_value"]
            }
            for sensor in self.sensor_definitions
        ]
    
    def get_current_data(self) -> Dict[str, Any]:
        """Generate current mock sensor data."""
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        data = {}
        
        for sensor in self.sensor_definitions:
            # Create realistic variations using sine waves and random noise
            time_factor = elapsed / 60.0  # Convert to minutes for slower variations
            
            # Base sine wave for gradual changes
            sine_variation = math.sin(time_factor * 0.1) * 0.3
            
            # Add some faster fluctuations
            fast_variation = math.sin(time_factor * 2.0) * 0.1
            
            # Add random noise
            noise = (random.random() - 0.5) * 0.2
            
            # Calculate final variation factor
            variation_factor = sine_variation + fast_variation + noise
            
            # Apply variation to base value
            current_value = sensor["base_value"] + (variation_factor * sensor["variation"])
            
            # Clamp to min/max values
            current_value = max(sensor["min_value"], min(sensor["max_value"], current_value))
            
            # Round based on sensor type
            if sensor["unit"] in ["RPM", "MHz"]:
                current_value = round(current_value)
            else:
                current_value = round(current_value, 1)
            
            data[sensor["id"]] = {
                "id": sensor["id"],
                "name": sensor["name"],
                "value": current_value,
                "unit": sensor["unit"],
                "category": sensor["category"],
                "min_value": sensor["min_value"],
                "max_value": sensor["max_value"],
                "source": "mock",
                "timestamp": datetime.now().isoformat()
            }
        
        return data
    
    def get_sensor_by_id(self, sensor_id: str) -> Dict[str, Any]:
        """Get a specific sensor's current data."""
        all_data = self.get_current_data()
        return all_data.get(sensor_id)
    
    def get_sensors_by_category(self, category: str) -> Dict[str, Any]:
        """Get all sensors in a specific category."""
        all_data = self.get_current_data()
        return {
            sensor_id: sensor_data 
            for sensor_id, sensor_data in all_data.items()
            if sensor_data["category"] == category
        } 