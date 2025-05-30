#!/usr/bin/env python3
"""
Test script for LibreHardwareMonitor DLL integration.
Run this to verify the DLL can be loaded and sensors can be read.
"""

import os
import sys
import asyncio
import logging

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.sensors.librehardware_sensor import LibreHardwareSensor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_lhm_dll():
    """Test LibreHardwareMonitor DLL integration."""
    print("=== LibreHardwareMonitor DLL Test ===")
    print()
    
    # Create sensor instance
    sensor = LibreHardwareSensor()
    
    try:
        # Test if DLL is available
        print("1. Testing DLL availability...")
        is_available = sensor.is_available()
        print(f"   DLL Available: {is_available}")
        
        if not is_available:
            print("   ❌ DLL not available. Check:")
            print("      - LibreHardwareMonitorLib.dll exists in project root")
            print("      - pythonnet is installed: pip install pythonnet")
            print("      - Running on Windows")
            return
        
        print("   ✅ DLL loaded successfully!")
        print()
        
        # Test getting available sensors
        print("2. Getting available sensors...")
        available_sensors = await sensor.get_available_sensors()
        print(f"   Found {len(available_sensors)} sensors")
        
        # Display first few sensors as examples
        for i, sensor_info in enumerate(available_sensors[:10]):
            print(f"   {i+1}. {sensor_info['name']} ({sensor_info['category']}) - {sensor_info['unit']}")
        
        if len(available_sensors) > 10:
            print(f"   ... and {len(available_sensors) - 10} more sensors")
        print()
        
        # Test getting current data
        print("3. Getting current sensor data...")
        current_data = await sensor.get_current_data()
        print(f"   Retrieved data for {len(current_data)} sensors")
        
        # Display some sample readings
        sample_count = 0
        for sensor_id, data in current_data.items():
            if sample_count >= 5:
                break
            print(f"   {data['name']}: {data['value']} {data['unit']} ({data['category']})")
            sample_count += 1
        
        if len(current_data) > 5:
            print(f"   ... and {len(current_data) - 5} more readings")
        print()
        
        # Test getting sensors by category
        print("4. Testing category filtering...")
        categories = set(data['category'] for data in current_data.values())
        print(f"   Available categories: {', '.join(sorted(categories))}")
        
        # Test temperature sensors
        if 'temperature' in categories:
            temp_sensors = await sensor.get_sensors_by_category('temperature')
            print(f"   Temperature sensors: {len(temp_sensors)}")
            for temp_sensor in temp_sensors[:3]:
                print(f"     {temp_sensor['name']}: {temp_sensor['value']}°C")
        
        print()
        print("✅ All tests passed! LibreHardwareMonitor DLL integration is working.")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up
        sensor.close()
        print("🧹 Cleanup completed.")

if __name__ == "__main__":
    # Check platform
    if sys.platform != "win32":
        print("❌ This test requires Windows platform for LibreHardwareMonitor DLL.")
        sys.exit(1)
    
    # Run test
    asyncio.run(test_lhm_dll()) 