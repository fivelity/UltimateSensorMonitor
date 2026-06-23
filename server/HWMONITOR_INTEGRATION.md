# HardwareMonitor Package Integration

This document explains the integration of the [HardwareMonitor PyPI package](https://pypi.org/project/HardwareMonitor/) into the Ultimate Sensor Monitor backend.

## Overview

The HardwareMonitor package provides a Python wrapper around LibreHardwareMonitor using pythonnet. It offers a cleaner, more robust interface compared to direct DLL access.

## Benefits

1. **Simplified Setup**: No need to manually manage the LibreHardwareMonitorLib.dll file
2. **Better Type Safety**: The package provides proper Python type hints
3. **Utility Functions**: Built-in helper functions for common operations
4. **Auto-generated Bindings**: More reliable than manual pythonnet integration
5. **Better Error Handling**: More predictable error messages and handling

## Installation

The HardwareMonitor package is automatically installed with the conda environment:

```bash
pip install HardwareMonitor
```

Or run the provided script:
```bash
server\install_hwmonitor.bat
```

## Implementation

### New Sensor Class

The `LibreHardwareSensorUpdated` class in `server/app/sensors/librehardware_sensor_new.py` provides the updated implementation:

- Uses `HardwareMonitor.Util.OpenComputer()` for simplified initialization
- Supports all hardware types (CPU, GPU, Memory, Motherboard, Storage, Network, etc.)
- Provides async-compatible methods
- Includes comprehensive error handling

### API Endpoints

New endpoint added: `/api/sensors/hardware-tree`
- Returns hierarchical view of all hardware components and sensors
- Provides organized structure: Hardware → SubHardware → Sensors

### Available in Sensor Sources

The updated implementation is available as "LibreHardwareMonitor Updated" in the sensor sources list.

## Usage

### Testing the Integration

1. **Run the test script with admin privileges:**
   ```bash
   server\test_hwmonitor_admin.bat
   ```

2. **Start the server (from project root):**
   ```powershell
   python start_backend.py
   # or full stack (auto-elevates backend for hardware access):
   .\start_ultimon_full.ps1
   ```

3. **Test the API endpoint:**
   ```
   GET http://localhost:8100/api/sensors/hardware-tree
   ```

### Admin Privileges Required

⚠️ **Important**: Hardware monitoring requires administrator privileges on Windows. The test script automatically requests elevation.

## Key Features

### Hardware Tree Endpoint
- **URL**: `/api/sensors/hardware-tree`
- **Method**: GET
- **Response**: Hierarchical structure of hardware components and sensors

Example response structure:
```json
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00",
  "hardware": [
    {
      "name": "Intel Core i7-8700K",
      "type": "Cpu",
      "sensors": [
        {
          "id": "cpu_core1_temp",
          "name": "CPU Core #1",
          "value": 45.0,
          "unit": "°C",
          "category": "temperature"
        }
      ],
      "subhardware": []
    }
  ]
}
```

### Sensor Categories

The implementation maps LibreHardwareMonitor sensor types to categories:
- `temperature` - Temperature sensors (°C)
- `load` - CPU/GPU load percentages (%)
- `clock` - Clock speeds (MHz)
- `voltage` - Voltage readings (V)
- `fan` - Fan speeds (RPM)
- `power` - Power consumption (W)
- `data` - Storage data (GB/MB)

## Migration from DLL Approach

The old direct DLL approach (`librehardware_sensor.py`) is still available for comparison, but the new HardwareMonitor package approach is recommended for:

1. **Better reliability**
2. **Easier maintenance**
3. **More consistent API**
4. **Better error handling**

## Troubleshooting

### Common Issues

1. **"Admin privileges required"**
   - Solution: Run the test script or server with administrator privileges

2. **"HardwareMonitor package not available"**
   - Solution: Run `server\install_hwmonitor.bat` to install the package

3. **"No sensors found"**
   - Check if LibreHardwareMonitor detects your hardware
   - Ensure proper admin privileges
   - Try running LibreHardwareMonitor GUI separately first

### Debug Steps

1. Run the simple test: `server\test_hwmonitor_admin.bat`
2. Check server logs for initialization messages
3. Verify admin privileges with `net session` command
4. Test the `/api/sensors/hardware-tree` endpoint directly

## References

- [HardwareMonitor PyPI Package](https://pypi.org/project/HardwareMonitor/)
- [LibreHardwareMonitor GitHub](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor)
- [pythonnet Documentation](https://pythonnet.github.io/) 