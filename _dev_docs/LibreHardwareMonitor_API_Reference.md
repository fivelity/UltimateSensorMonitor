# LibreHardwareMonitor API Reference
*Technical Reference for Ultimate Sensor Monitor Backend API*

## API Endpoints

### 1. Health & Status

#### `GET /`
**Description**: Basic health check endpoint  
**Response**:
```json
{
    "message": "Ultimate Sensor Monitor Reimagined API",
    "version": "1.0.0"
}
```

#### `GET /api/debug/sensors`
**Description**: Debug endpoint with detailed sensor information  
**Response**:
```json
{
    "sensor_sources": {
        "librehardware_updated": {
            "name": "LibreHardwareMonitor Updated",
            "active": true,
            "sensor_count": 45,
            "sensors": { /* sensor data */ }
        }
    },
    "total_sensors": 45,
    "categories": {
        "temperature": 12,
        "load": 8,
        "power": 6,
        "fan": 4,
        "voltage": 10,
        "clock": 5
    }
}
```

### 2. Sensor Data Endpoints

#### `GET /api/sensors`
**Description**: Get all available sensor sources and their sensors  
**Response**:
```json
{
    "sources": {
        "librehardware_updated": {
            "id": "librehardware_updated",
            "name": "LibreHardwareMonitor Updated",
            "active": true,
            "sensors": {
                "cpu_temperature_0": {
                    "id": "cpu_temperature_0",
                    "name": "CPU Package",
                    "category": "temperature",
                    "unit": "°C",
                    "parent": "AMD Ryzen 7 3700X"
                }
            },
            "last_update": "2024-01-15T10:30:45.123Z"
        }
    }
}
```

#### `GET /api/sensors/current`
**Description**: Get current sensor readings from all sources  
**Response**:
```json
{
    "timestamp": "2024-01-15T10:30:45.123Z",
    "sources": {
        "librehardware_updated": {
            "source": "LibreHardwareMonitor Updated",
            "active": true,
            "sensors": {
                "cpu_temperature_0": {
                    "id": "cpu_temperature_0",
                    "name": "CPU Package",
                    "value": 65.5,
                    "unit": "°C",
                    "category": "temperature",
                    "min_value": 28.0,
                    "max_value": 85.0,
                    "parent": "AMD Ryzen 7 3700X",
                    "timestamp": "2024-01-15T10:30:45.123Z"
                }
            },
            "last_update": "2024-01-15T10:30:45.123Z"
        }
    }
}
```

#### `GET /api/sensors/hardware-tree`
**Description**: Hierarchical view of hardware components and sensors (LibreHardwareMonitor Updated only)  
**Response**:
```json
{
    "success": true,
    "timestamp": "2024-01-15T10:30:45.123Z",
    "hardware": [
        {
            "name": "AMD Ryzen 7 3700X",
            "type": "Cpu",
            "sensors": [
                {
                    "id": "cpu_temperature_0",
                    "name": "CPU Package",
                    "value": 65.5,
                    "unit": "°C",
                    "category": "temperature",
                    "min": 28.0,
                    "max": 85.0
                }
            ],
            "subhardware": [
                {
                    "name": "Core #1",
                    "type": "Cpu",
                    "sensors": [
                        {
                            "id": "cpu_core_1_temperature",
                            "name": "CPU Core #1",
                            "value": 62.0,
                            "unit": "°C",
                            "category": "temperature",
                            "min": 25.0,
                            "max": 80.0
                        }
                    ]
                }
            ]
        }
    ]
}
```

### 3. WebSocket Communication

#### Connection: `ws://localhost:8100/ws`

**Connection Flow**:
1. Client connects to WebSocket endpoint
2. Server sends welcome message
3. Server broadcasts sensor data every 2 seconds
4. Client processes real-time updates

**Message Types**:

##### Connection Established
```json
{
    "type": "connection_established",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "message": "Connected to Ultimate Sensor Monitor Reimagined"
}
```

##### Sensor Data Broadcast
```json
{
    "type": "sensor_data",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "sources": {
        "librehardware_updated": {
            "source": "LibreHardwareMonitor Updated",
            "active": true,
            "sensors": {
                "cpu_temperature_0": {
                    "id": "cpu_temperature_0",
                    "name": "CPU Package",
                    "value": 65.5,
                    "unit": "°C",
                    "category": "temperature",
                    "min_value": 28.0,
                    "max_value": 85.0,
                    "parent": "AMD Ryzen 7 3700X",
                    "timestamp": "2024-01-15T10:30:45.123Z"
                }
            },
            "last_update": "2024-01-15T10:30:45.123Z"
        }
    }
}
```

##### Error Message
```json
{
    "type": "error",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "content": {
        "error": "Sensor initialization failed",
        "details": "LibreHardwareMonitor requires administrator privileges"
    }
}
```

## Data Models

### SensorData
```python
class SensorData:
    id: str                    # Unique sensor identifier
    name: str                  # Human-readable sensor name
    value: float               # Current sensor reading
    unit: str                  # Unit of measurement
    category: str              # Sensor category
    source: str                # Data source name
    min_value: Optional[float] # Historical minimum
    max_value: Optional[float] # Historical maximum
    parent: str                # Parent hardware component
    timestamp: datetime        # Reading timestamp
```

### Sensor Categories
- `temperature` - Temperature sensors (°C)
- `load` - CPU/GPU usage (%)
- `power` - Power consumption (W)
- `fan` - Fan speeds (RPM)
- `voltage` - Voltage readings (V)
- `clock` - Clock frequencies (MHz)
- `data` - Data storage (GB/MB)
- `throughput` - Data transfer rates (B/s)
- `flow` - Liquid cooling flow (L/h)
- `control` - Fan control settings (%)
- `level` - Storage levels (%)
- `factor` - Multiplier values
- `time` - Time measurements (s)
- `energy` - Energy consumption (mWh)
- `noise` - Noise levels (dBA)

## Configuration

### Environment Variables
- `SENSOR_UPDATE_INTERVAL` - Update interval in seconds (default: 2)
- `DEBUG_MODE` - Enable debug logging (default: False)
- `CORS_ORIGINS` - Allowed CORS origins (default: localhost:5501,localhost:4173)

### Startup Configuration
```python
# Enable all hardware components
computer = OpenComputer(
    motherboard=True,
    cpu=True,
    gpu=True,
    memory=True,
    storage=True,
    network=True,
    controller=True,
    battery=True
)
```

## Error Handling

### Common Error Responses

#### 404 - Not Found
```json
{
    "detail": "Preset not found"
}
```

#### 500 - Internal Server Error
```json
{
    "detail": "Failed to initialize LibreHardwareMonitor"
}
```

#### WebSocket Connection Errors
- `1000` - Normal closure
- `1001` - Going away
- `1006` - Abnormal closure (connection lost)

### Error Scenarios

1. **LibreHardwareMonitor Unavailable**
   - Sensor source marked as inactive
   - Fallback to mock data or other sources
   - Error logged but doesn't crash application

2. **Admin Privileges Missing**
   - Hardware monitoring fails to initialize
   - Clear error message in logs
   - Application continues with available sources

3. **WebSocket Connection Issues**
   - Automatic reconnection with exponential backoff
   - Connection status updates in frontend
   - Graceful degradation to polling if needed

## Performance Metrics

### Backend Performance
- **Sensor Collection**: ~50-100ms for full hardware scan
- **Data Caching**: 1-second cache to reduce DLL overhead
- **WebSocket Broadcast**: <10ms for typical payload
- **Memory Usage**: ~50-100MB for LibreHardwareMonitor

### Frontend Performance
- **WebSocket Handling**: <5ms message processing
- **Store Updates**: Reactive updates with minimal overhead
- **Widget Rendering**: 60fps smooth animations
- **Data Storage**: Efficient Svelte store management

## Monitoring and Logging

### Log Levels
- `INFO` - Normal operation, connection events
- `WARNING` - Non-critical issues, fallback scenarios
- `ERROR` - Critical failures, sensor initialization problems
- `DEBUG` - Detailed sensor processing information

### Key Log Messages

#### Backend
```
INFO: ✓ LibreHardwareMonitor initialized successfully with all components enabled
INFO: New WebSocket connection established. Total connections: 1
INFO: Collected 45 sensors from LibreHardwareMonitor
ERROR: Failed to initialize LibreHardwareMonitor: Access denied
WARNING: Sensor cpu_temp_invalid has no value, skipping
```

#### Frontend
```
[WebSocket] Connected to sensor data stream
[Store] Updating sensor data: 45 sensors
[Widget] Created temperature widget: temp_widget_cpu_temperature_0
[Connection] Status changed: connected → disconnected
```

## Security Considerations

### Backend Security
- **Admin Privileges**: Required for hardware access, validate source
- **Input Validation**: All sensor data validated before processing
- **Error Sanitization**: No sensitive system info in error responses
- **Resource Limits**: Connection limits and cleanup for WebSockets

### Network Security
- **CORS Configuration**: Restrict allowed origins in production
- **WebSocket Origin**: Validate WebSocket connection origins
- **Rate Limiting**: Consider implementing for production use
- **HTTPS/WSS**: Use secure connections in production

## Testing and Validation

### Test Scripts
```bash
# Test backend connectivity and sensor data
python test_connection.py

# Start with admin privileges (Windows full stack)
.\start_ultimon_full.ps1

# Backend-only testing (any platform)
python start_backend.py
```

### Validation Checklist
- [ ] Backend starts with admin privileges
- [ ] LibreHardwareMonitor initializes successfully
- [ ] WebSocket connection establishes
- [ ] Sensor data broadcasts every 2 seconds
- [ ] Frontend receives and processes data
- [ ] Widgets display real-time values
- [ ] Connection status updates correctly
- [ ] Error handling works gracefully

### Common Test Scenarios

1. **Normal Operation**
   - All components working
   - Real-time data flow
   - Widgets updating correctly

2. **Admin Privileges Missing**
   - Backend starts but sensor init fails
   - Graceful fallback to demo data
   - Clear error messaging

3. **Network Issues**
   - WebSocket disconnection
   - Automatic reconnection
   - Status indicator updates

4. **Hardware Issues**
   - Some sensors unavailable
   - Partial data collection
   - Continued operation with available sensors

This API reference provides the technical details needed to integrate with and troubleshoot the LibreHardwareMonitor sensor data system in the Ultimate Sensor Monitor application. 