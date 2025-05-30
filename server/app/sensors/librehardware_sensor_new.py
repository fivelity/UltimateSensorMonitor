"""
LibreHardwareMonitor sensor integration using the HardwareMonitor Python package.
This provides a cleaner interface to LibreHardwareMonitor via the HardwareMonitor PyPI package.
"""

import time
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from .base import BaseSensor
from ..models import SensorData

logger = logging.getLogger(__name__)

# Try to import HardwareMonitor package
try:
    from HardwareMonitor.Hardware import Computer, HardwareType, SensorType
    from HardwareMonitor.Util import OpenComputer, ToBuiltinTypes, GroupSensorsByType, SensorValueToString
    HARDWARE_MONITOR_AVAILABLE = True
    logger.info("✓ HardwareMonitor package loaded successfully")
except ImportError as e:
    logger.error(f"HardwareMonitor package not available: {e}")
    logger.error("Please install with: pip install HardwareMonitor")
    HARDWARE_MONITOR_AVAILABLE = False


class LibreHardwareSensorUpdated(BaseSensor):
    """Improved sensor implementation using the HardwareMonitor Python package."""
    
    def __init__(self):
        super().__init__("LibreHardwareMonitor (Updated)")
        
        # HardwareMonitor objects
        self.computer = None
        self.is_active = None  # None = not tested yet, True/False = tested
        self._connection_tested = False
        
        # Cache
        self.cached_data = {}
        self.cache_duration = 1.0  # Cache for 1 second
        self.last_update = None
    
    def _initialize_hwmonitor(self) -> bool:
        """Initialize HardwareMonitor and Computer object."""
        if not HARDWARE_MONITOR_AVAILABLE:
            logger.error("HardwareMonitor package is not available")
            return False
        
        try:
            # Use the utility function to create and configure the computer
            # Enable all available hardware components
            self.computer = OpenComputer(
                motherboard=True,
                cpu=True,
                gpu=True,
                memory=True,
                storage=True,
                network=True,
                controller=True,
                battery=True
            )
            
            logger.info("✓ HardwareMonitor initialized successfully with all components enabled")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize HardwareMonitor: {e}")
            return False
    
    def _test_connection(self) -> bool:
        """Test if the HardwareMonitor can be initialized."""
        if self._connection_tested:
            return self.is_active
        
        logger.info("Testing HardwareMonitor connection...")
        
        self.is_active = self._initialize_hwmonitor()
        self._connection_tested = True
        
        if self.is_active:
            logger.info("✓ HardwareMonitor connection successful")
        else:
            logger.error("✗ HardwareMonitor connection failed")
        
        return self.is_active
    
    def _collect_sensor_data_from_hwmonitor(self) -> Dict[str, SensorData]:
        """Collect sensor data using HardwareMonitor package."""
        sensors = {}
        
        if not self.computer:
            return sensors
        
        try:
            # Update all sensors
            self.computer.Update()
            
            # Process all hardware components
            for hardware in self.computer.Hardware:
                self._process_hardware_sensors(hardware, sensors, "")
                
                # Process sub-hardware
                for subhardware in hardware.SubHardware:
                    parent_path = f"{hardware.Name}"
                    self._process_hardware_sensors(subhardware, sensors, parent_path)
            
            logger.info(f"Collected {len(sensors)} sensors from LibreHardwareMonitor")
            
        except Exception as e:
            logger.error(f"Error collecting sensor data from HardwareMonitor: {e}")
        
        return sensors
    
    def _process_hardware_sensors(self, hardware, sensors: Dict[str, SensorData], parent_path: str):
        """Process sensors from a hardware object."""
        try:
            hardware_name = str(hardware.Name)
            current_path = f"{parent_path}/{hardware_name}" if parent_path else hardware_name
            
            for sensor in hardware.Sensors:
                try:
                    sensor_name = str(sensor.Name)
                    sensor_value = sensor.Value
                    
                    # Skip sensors without values
                    if sensor_value is None:
                        continue
                    
                    # Convert to Python float
                    try:
                        value = float(sensor_value)
                    except (ValueError, TypeError):
                        continue
                    
                    # Get sensor type and determine category/unit
                    sensor_type = sensor.SensorType
                    category, unit = self._map_sensor_type_to_category(sensor_type)
                    
                    # Generate unique sensor ID
                    sensor_id = self._generate_sensor_id(hardware, sensor)
                    
                    # Get min/max values if available
                    min_value = float(sensor.Min) if sensor.Min is not None else None
                    max_value = float(sensor.Max) if sensor.Max is not None else None
                    
                    sensors[sensor_id] = SensorData(
                        id=sensor_id,
                        name=sensor_name,
                        value=value,
                        unit=unit,
                        category=category,
                        source=self.source_name,
                        min_value=min_value,
                        max_value=max_value,
                        parent=current_path,
                        timestamp=datetime.now()
                    )
                    
                except Exception as e:
                    logger.debug(f"Failed to process sensor {sensor.Name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error processing hardware sensors: {e}")
    
    def _map_sensor_type_to_category(self, sensor_type) -> tuple[str, str]:
        """Map HardwareMonitor SensorType to our category and unit."""
        try:
            # Map sensor types to categories and units
            type_mapping = {
                SensorType.Voltage: ("voltage", "V"),
                SensorType.Clock: ("clock", "MHz"),
                SensorType.Temperature: ("temperature", "°C"),
                SensorType.Load: ("load", "%"),
                SensorType.Fan: ("fan", "RPM"),
                SensorType.Flow: ("flow", "L/h"),
                SensorType.Control: ("control", "%"),
                SensorType.Level: ("level", "%"),
                SensorType.Factor: ("factor", ""),
                SensorType.Power: ("power", "W"),
                SensorType.Data: ("data", "GB"),
                SensorType.SmallData: ("data", "MB"),
                SensorType.Throughput: ("throughput", "B/s"),
                SensorType.TimeSpan: ("time", "s"),
                SensorType.Energy: ("energy", "mWh"),
                SensorType.Noise: ("noise", "dBA"),
            }
            
            return type_mapping.get(sensor_type, ("unknown", ""))
            
        except Exception as e:
            logger.debug(f"Error mapping sensor type: {e}")
            return ("unknown", "")
    
    def _generate_sensor_id(self, hardware, sensor) -> str:
        """Generate a unique sensor ID from hardware and sensor objects."""
        try:
            # Create ID from hardware identifier and sensor identifier
            hardware_id = str(hardware.Identifier).replace("/", "_").replace(" ", "_")
            sensor_id = str(sensor.Identifier).replace("/", "_").replace(" ", "_")
            
            # Clean up the IDs
            import re
            hardware_id = re.sub(r'[^\w_]', '', hardware_id.lower())
            sensor_id = re.sub(r'[^\w_]', '', sensor_id.lower())
            
            return f"{hardware_id}_{sensor_id}"
            
        except Exception as e:
            logger.debug(f"Error generating sensor ID: {e}")
            # Fallback to simple name-based ID
            return f"{hardware.Name}_{sensor.Name}".replace(" ", "_").lower()
    
    async def _collect_sensor_data(self) -> Dict[str, SensorData]:
        """Collect sensor data (async wrapper)."""
        # Check cache first
        if (self.last_update and 
            time.time() - self.last_update < self.cache_duration and
            self.cached_data):
            return self.cached_data
        
        # Collect data in thread pool since the calls are synchronous
        loop = asyncio.get_event_loop()
        try:
            sensors = await loop.run_in_executor(None, self._collect_sensor_data_from_hwmonitor)
            
            # Update cache
            self.cached_data = sensors
            self.last_update = time.time()
            
            return sensors
            
        except Exception as e:
            logger.error(f"Error in async sensor data collection: {e}")
            return {}
    
    def is_available(self) -> bool:
        """Check if HardwareMonitor is available."""
        return self._test_connection()
    
    async def get_available_sensors(self) -> List[Dict[str, Any]]:
        """Get list of all available sensors."""
        if not self.is_available():
            return []
        
        sensors_data = await self._collect_sensor_data()
        
        return [
            {
                "id": sensor.id,
                "name": sensor.name,
                "category": sensor.category,
                "unit": sensor.unit,
                "parent": sensor.parent
            }
            for sensor in sensors_data.values()
        ]
    
    async def get_current_data(self) -> Dict[str, Any]:
        """Get current sensor readings."""
        if not self.is_available():
            return {}
        
        sensors_data = await self._collect_sensor_data()
        
        return {
            sensor_id: {
                "id": sensor.id,
                "name": sensor.name,
                "value": sensor.value,
                "unit": sensor.unit,
                "category": sensor.category,
                "min_value": sensor.min_value,
                "max_value": sensor.max_value,
                "parent": sensor.parent,
                "timestamp": sensor.timestamp.isoformat()
            }
            for sensor_id, sensor in sensors_data.items()
        }
    
    async def get_sensor_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        """Get specific sensor by ID."""
        sensors_data = await self._collect_sensor_data()
        sensor = sensors_data.get(sensor_id)
        
        if sensor:
            return {
                "id": sensor.id,
                "name": sensor.name,
                "value": sensor.value,
                "unit": sensor.unit,
                "category": sensor.category,
                "min_value": sensor.min_value,
                "max_value": sensor.max_value,
                "parent": sensor.parent,
                "timestamp": sensor.timestamp.isoformat()
            }
        return None
    
    async def get_sensors_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get all sensors of a specific category."""
        sensors_data = await self._collect_sensor_data()
        
        return [
            {
                "id": sensor.id,
                "name": sensor.name,
                "value": sensor.value,
                "unit": sensor.unit,
                "category": sensor.category,
                "min_value": sensor.min_value,
                "max_value": sensor.max_value,
                "parent": sensor.parent,
                "timestamp": sensor.timestamp.isoformat()
            }
            for sensor in sensors_data.values()
            if sensor.category == category
        ]
    
    async def refresh(self) -> bool:
        """Refresh sensor data."""
        try:
            # Clear cache to force refresh
            self.cached_data = {}
            self.last_update = None
            
            # Collect fresh data
            await self._collect_sensor_data()
            return True
            
        except Exception as e:
            logger.error(f"Error refreshing sensor data: {e}")
            return False
    
    def close(self):
        """Clean up HardwareMonitor resources."""
        try:
            if self.computer:
                logger.info("Closing HardwareMonitor...")
                self.computer.Close()
                self.computer = None
                logger.info("✓ HardwareMonitor closed successfully")
        except Exception as e:
            logger.error(f"Error closing HardwareMonitor: {e}")
    
    def __del__(self):
        """Destructor to ensure cleanup."""
        self.close()

    async def get_hardware_tree(self) -> List[Dict[str, Any]]:
        """Get hierarchical view of all hardware and sensors."""
        if not self.is_available():
            return []
        
        hardware_tree = []
        
        try:
            # Update all sensors first
            self.computer.Update()
            
            for hardware in self.computer.Hardware:
                hardware_info = {
                    "name": str(hardware.Name),
                    "type": str(hardware.HardwareType),
                    "sensors": [],
                    "subhardware": []
                }
                
                # Add sensors for this hardware
                for sensor in hardware.Sensors:
                    if sensor.Value is not None:
                        sensor_type = sensor.SensorType
                        category, unit = self._map_sensor_type_to_category(sensor_type)
                        
                        hardware_info["sensors"].append({
                            "id": self._generate_sensor_id(hardware, sensor),
                            "name": str(sensor.Name),
                            "value": float(sensor.Value),
                            "unit": unit,
                            "category": category,
                            "min": float(sensor.Min) if sensor.Min is not None else None,
                            "max": float(sensor.Max) if sensor.Max is not None else None
                        })
                
                # Add sub-hardware
                for subhardware in hardware.SubHardware:
                    subhw_info = {
                        "name": str(subhardware.Name),
                        "type": str(subhardware.HardwareType),
                        "sensors": []
                    }
                    
                    for sensor in subhardware.Sensors:
                        if sensor.Value is not None:
                            sensor_type = sensor.SensorType
                            category, unit = self._map_sensor_type_to_category(sensor_type)
                            
                            subhw_info["sensors"].append({
                                "id": self._generate_sensor_id(subhardware, sensor),
                                "name": str(sensor.Name),
                                "value": float(sensor.Value),
                                "unit": unit,
                                "category": category,
                                "min": float(sensor.Min) if sensor.Min is not None else None,
                                "max": float(sensor.Max) if sensor.Max is not None else None
                            })
                    
                    hardware_info["subhardware"].append(subhw_info)
                
                hardware_tree.append(hardware_info)
            
        except Exception as e:
            logger.error(f"Error getting hardware tree: {e}")
        
        return hardware_tree 