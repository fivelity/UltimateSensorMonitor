"""
HWiNFO64 sensor integration.
Reads hardware data from HWiNFO64's shared memory interface.
"""

import struct
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from .base import BaseSensor
from ..models import SensorData

logger = logging.getLogger(__name__)

try:
    import mmap
    import ctypes
    from ctypes import wintypes
    MMAP_AVAILABLE = True
except ImportError:
    MMAP_AVAILABLE = False
    logger.warning("Memory mapping not available - HWiNFO64 integration disabled")


class HWiNFOSensor(BaseSensor):
    """Sensor implementation for HWiNFO64 shared memory."""
    
    # HWiNFO64 shared memory constants
    HWINFO_SHARED_MEM_FILE_PREFIX = "Global\\HWiNFO_SENS_SM2"
    HWINFO_SENSORS_STRING_LEN = 128
    HWINFO_UNIT_STRING_LEN = 16
    
    def __init__(self):
        super().__init__()
        self.source_name = "HWiNFO64"
        self.is_active = False
        self.last_update = None
        self.cached_data = {}
        self.cache_duration = 1.0  # Cache for 1 second
        self.shared_mem_handle = None
        
        if MMAP_AVAILABLE:
            self._check_availability()
    
    def _check_availability(self):
        """Check if HWiNFO64 shared memory is available."""
        if not MMAP_AVAILABLE:
            return
            
        try:
            # Try to open HWiNFO64 shared memory
            kernel32 = ctypes.windll.kernel32
            
            # Open shared memory object
            handle = kernel32.OpenFileMappingW(
                0x0004,  # FILE_MAP_READ
                False,
                self.HWINFO_SHARED_MEM_FILE_PREFIX
            )
            
            if handle:
                self.shared_mem_handle = handle
                self.is_active = True
                logger.info("HWiNFO64 shared memory interface detected")
            else:
                logger.warning("HWiNFO64 shared memory not available")
                
        except Exception as e:
            logger.warning(f"Failed to check HWiNFO64 availability: {e}")
    
    def _read_shared_memory(self) -> Optional[bytes]:
        """Read data from HWiNFO64 shared memory."""
        if not self.shared_mem_handle:
            return None
            
        try:
            kernel32 = ctypes.windll.kernel32
            
            # Map view of file
            mapped_memory = kernel32.MapViewOfFile(
                self.shared_mem_handle,
                0x0004,  # FILE_MAP_READ
                0, 0, 0  # Map entire file
            )
            
            if not mapped_memory:
                return None
            
            # Read header to get data size
            header_size = 16  # Assume 16-byte header
            header = ctypes.string_at(mapped_memory, header_size)
            
            # Parse header to determine total size
            # This is a simplified implementation - actual HWiNFO format may vary
            total_size = struct.unpack('<L', header[8:12])[0] if len(header) >= 12 else 4096
            
            # Read the actual data
            data = ctypes.string_at(mapped_memory, min(total_size, 65536))  # Cap at 64KB
            
            # Unmap view
            kernel32.UnmapViewOfFile(mapped_memory)
            
            return data
            
        except Exception as e:
            logger.error(f"Failed to read HWiNFO64 shared memory: {e}")
            return None
    
    def _parse_hwinfo_data(self, data: bytes) -> Dict[str, SensorData]:
        """Parse HWiNFO64 shared memory data."""
        sensors = {}
        
        if not data or len(data) < 32:
            return sensors
        
        try:
            # Parse HWiNFO64 data structure
            # This is a simplified parser - actual format depends on HWiNFO version
            offset = 16  # Skip header
            sensor_count = 0
            
            while offset < len(data) - 200 and sensor_count < 200:  # Safety limits
                try:
                    # Read sensor entry (simplified structure)
                    if offset + 200 > len(data):
                        break
                    
                    # Sensor name (128 bytes)
                    name_bytes = data[offset:offset + self.HWINFO_SENSORS_STRING_LEN]
                    name = name_bytes.decode('utf-8', errors='ignore').rstrip('\x00')
                    offset += self.HWINFO_SENSORS_STRING_LEN
                    
                    if not name:
                        offset += 72  # Skip rest of entry
                        continue
                    
                    # Unit (16 bytes)
                    unit_bytes = data[offset:offset + self.HWINFO_UNIT_STRING_LEN]
                    unit = unit_bytes.decode('utf-8', errors='ignore').rstrip('\x00')
                    offset += self.HWINFO_UNIT_STRING_LEN
                    
                    # Value (4 bytes float)
                    value = struct.unpack('<f', data[offset:offset + 4])[0]
                    offset += 4
                    
                    # Min/Max values (8 bytes)
                    min_val, max_val = struct.unpack('<ff', data[offset:offset + 8])
                    offset += 8
                    
                    # Skip additional fields (40 bytes)
                    offset += 40
                    
                    # Create sensor data
                    sensor_id = self._generate_sensor_id(name)
                    category = self._determine_category(name, unit)
                    
                    sensors[sensor_id] = SensorData(
                        id=sensor_id,
                        name=name,
                        value=value,
                        unit=unit,
                        min_value=min_val if min_val != 0 else None,
                        max_value=max_val if max_val != 0 else None,
                        source=self.source_name,
                        category=category,
                        timestamp=datetime.now().isoformat()
                    )
                    
                    sensor_count += 1
                    
                except (struct.error, UnicodeDecodeError, IndexError) as e:
                    logger.debug(f"Error parsing sensor at offset {offset}: {e}")
                    offset += 200  # Skip problematic entry
                    continue
        
        except Exception as e:
            logger.error(f"Failed to parse HWiNFO64 data: {e}")
        
        return sensors
    
    def _generate_sensor_id(self, name: str) -> str:
        """Generate a unique sensor ID from name."""
        return ''.join(c.lower() if c.isalnum() else '_' for c in name)
    
    def _determine_category(self, name: str, unit: str) -> str:
        """Determine sensor category from name and unit."""
        name_lower = name.lower()
        unit_lower = unit.lower()
        
        if '°c' in unit_lower or 'temp' in name_lower:
            return 'temperature'
        elif '%' in unit and ('usage' in name_lower or 'load' in name_lower or 'util' in name_lower):
            return 'usage'
        elif 'rpm' in unit_lower or 'fan' in name_lower:
            return 'fan'
        elif 'w' == unit_lower or 'power' in name_lower:
            return 'power'
        elif 'v' == unit_lower or 'volt' in name_lower:
            return 'voltage'
        elif 'mhz' in unit_lower or 'ghz' in unit_lower or 'clock' in name_lower or 'freq' in name_lower:
            return 'frequency'
        elif 'mb' in unit_lower or 'gb' in unit_lower or 'memory' in name_lower:
            return 'memory'
        else:
            return 'other'
    
    def get_available_sensors(self) -> List[Dict[str, Any]]:
        """Get list of available sensors."""
        if not self.is_active:
            return []
        
        # Use cached data if recent
        current_time = time.time()
        if (self.last_update and 
            current_time - self.last_update < self.cache_duration and 
            self.cached_data):
            return [sensor.dict() for sensor in self.cached_data.values()]
        
        # Read fresh data
        data = self._read_shared_memory()
        if data:
            sensor_data = self._parse_hwinfo_data(data)
            self.cached_data = sensor_data
            self.last_update = current_time
            return [sensor.dict() for sensor in sensor_data.values()]
        
        return []
    
    def get_current_data(self) -> Dict[str, Any]:
        """Get current sensor readings."""
        sensors = self.get_available_sensors()
        return {
            "source": self.source_name,
            "active": self.is_active,
            "sensors": {sensor["id"]: sensor for sensor in sensors},
            "last_update": datetime.now().isoformat(),
            "sensor_count": len(sensors)
        }
    
    def get_sensor_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        """Get specific sensor data by ID."""
        sensors = self.get_available_sensors()
        for sensor in sensors:
            if sensor["id"] == sensor_id:
                return sensor
        return None
    
    def get_sensors_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get sensors filtered by category."""
        sensors = self.get_available_sensors()
        return [sensor for sensor in sensors if sensor.get("category") == category]
    
    def is_available(self) -> bool:
        """Check if the sensor source is available."""
        return self.is_active and MMAP_AVAILABLE
    
    def refresh(self) -> bool:
        """Refresh sensor availability and data."""
        if MMAP_AVAILABLE:
            self._check_availability()
            if self.is_active:
                # Clear cache to force fresh data
                self.cached_data = {}
                self.last_update = None
        return self.is_active
    
    def __del__(self):
        """Cleanup shared memory handle."""
        if self.shared_mem_handle:
            try:
                ctypes.windll.kernel32.CloseHandle(self.shared_mem_handle)
            except:
                pass 