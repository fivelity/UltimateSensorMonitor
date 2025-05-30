"""
Test script for the new HardwareMonitor package implementation.
This script tests the LibreHardwareSensorUpdated class to ensure it works correctly.
"""

import asyncio
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_hwmonitor_package():
    """Test the HardwareMonitor package implementation."""
    logger.info("Starting HardwareMonitor package test...")
    
    try:
        # Import the new sensor implementation
        from app.sensors.librehardware_sensor_new import LibreHardwareSensorUpdated
        
        # Create sensor instance
        sensor = LibreHardwareSensorUpdated()
        
        # Test availability
        logger.info("Testing sensor availability...")
        is_available = sensor.is_available()
        logger.info(f"Sensor available: {is_available}")
        
        if not is_available:
            logger.error("HardwareMonitor is not available. This might be due to:")
            logger.error("1. Insufficient admin privileges")
            logger.error("2. LibreHardwareMonitorLib.dll not found")
            logger.error("3. HardwareMonitor package not installed correctly")
            return
        
        # Test getting available sensors
        logger.info("Getting available sensors...")
        available_sensors = await sensor.get_available_sensors()
        logger.info(f"Found {len(available_sensors)} sensors")
        
        if available_sensors:
            logger.info("Sample sensors:")
            for i, sensor_info in enumerate(available_sensors[:5]):  # Show first 5
                logger.info(f"  {i+1}. {sensor_info['name']} ({sensor_info['category']}) - {sensor_info['parent']}")
        
        # Test getting current data
        logger.info("Getting current sensor data...")
        current_data = await sensor.get_current_data()
        logger.info(f"Retrieved {len(current_data)} sensor readings")
        
        # Test getting hardware tree
        logger.info("Getting hardware tree...")
        hardware_tree = await sensor.get_hardware_tree()
        logger.info(f"Found {len(hardware_tree)} hardware components")
        
        if hardware_tree:
            logger.info("Hardware components:")
            for hw in hardware_tree:
                sensor_count = len(hw['sensors'])
                subhw_count = len(hw['subhardware'])
                logger.info(f"  - {hw['name']} ({hw['type']}): {sensor_count} sensors, {subhw_count} subcomponents")
        
        # Test specific sensor categories
        logger.info("Testing specific categories...")
        categories = ["temperature", "load", "clock", "voltage", "fan"]
        for category in categories:
            sensors_in_category = await sensor.get_sensors_by_category(category)
            if sensors_in_category:
                logger.info(f"  {category}: {len(sensors_in_category)} sensors")
                # Show one example
                example = sensors_in_category[0]
                logger.info(f"    Example: {example['name']} = {example['value']} {example['unit']}")
        
        # Test refresh
        logger.info("Testing refresh...")
        refresh_result = await sensor.refresh()
        logger.info(f"Refresh successful: {refresh_result}")
        
        # Clean up
        logger.info("Cleaning up...")
        sensor.close()
        
        logger.info("✓ All tests completed successfully!")
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error("Make sure the HardwareMonitor package is installed: pip install HardwareMonitor")
    except Exception as e:
        logger.error(f"Test error: {e}")
        import traceback
        traceback.print_exc()

def test_simple_hwmonitor():
    """Simple synchronous test of HardwareMonitor package."""
    logger.info("Running simple HardwareMonitor test...")
    
    try:
        from HardwareMonitor.Hardware import Computer
        from HardwareMonitor.Util import OpenComputer
        
        logger.info("Creating computer instance...")
        computer = OpenComputer(cpu=True, gpu=True, motherboard=True)
        
        logger.info("Updating sensors...")
        computer.Update()
        
        logger.info("Enumerating hardware...")
        hardware_count = 0
        sensor_count = 0
        
        for hardware in computer.Hardware:
            hardware_count += 1
            logger.info(f"Hardware: {hardware.Name} ({hardware.HardwareType})")
            
            for sensor in hardware.Sensors:
                if sensor.Value is not None:
                    sensor_count += 1
                    logger.info(f"  Sensor: {sensor.Name} = {sensor.Value} ({sensor.SensorType})")
            
            for subhardware in hardware.SubHardware:
                hardware_count += 1
                logger.info(f"  SubHardware: {subhardware.Name} ({subhardware.HardwareType})")
                
                for sensor in subhardware.Sensors:
                    if sensor.Value is not None:
                        sensor_count += 1
                        logger.info(f"    Sensor: {sensor.Name} = {sensor.Value} ({sensor.SensorType})")
        
        logger.info(f"Found {hardware_count} hardware components and {sensor_count} sensors")
        
        logger.info("Closing computer...")
        computer.Close()
        
        logger.info("✓ Simple test completed successfully!")
        
    except Exception as e:
        logger.error(f"Simple test error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("HardwareMonitor Package Test")
    logger.info("=" * 60)
    
    # Run simple test first
    test_simple_hwmonitor()
    
    logger.info("")
    logger.info("-" * 60)
    logger.info("")
    
    # Run async test
    asyncio.run(test_hwmonitor_package()) 