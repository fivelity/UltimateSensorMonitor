# LibreHardwareMonitor Integration Guide
*Ultimate Sensor Monitor Reimagined - Real-time Hardware Monitoring Data Flow*

## Overview

This document explains how LibreHardwareMonitor integration works to provide real-time hardware sensor data from the backend to the frontend in the Ultimate Sensor Monitor application. The system uses a multi-layered architecture to collect, process, and display hardware monitoring data.

## Architecture Overview

```
Hardware Sensors
        ↓
LibreHardwareMonitor DLL
        ↓
Python Backend (FastAPI)
        ↓
WebSocket Connection
        ↓
SvelteKit Frontend
        ↓
Widget Displays
```

## Backend Integration

### 1. Sensor Implementation Classes

The backend includes two LibreHardwareMonitor implementations:

#### A. Legacy Implementation (`librehardware_sensor.py`)
- **Direct DLL Access**: Uses `pythonnet` to directly interface with `LibreHardwareMonitorLib.dll`
- **Manual Setup**: Requires manual DLL management and path configuration
- **Lower Level**: More control but requires careful error handling

#### B. Updated Implementation (`librehardware_sensor_new.py`) ⭐ **Recommended**
- **HardwareMonitor Package**: Uses the `HardwareMonitor` PyPI package
- **Simplified Setup**: Cleaner interface with built-in utilities
- **Better Error Handling**: More robust with proper Python type hints

### 2. Data Collection Process

```python
# Initialization
computer = OpenComputer(
    motherboard=True, cpu=True, gpu=True, 
    memory=True, storage=True, network=True, 
    controller=True, battery=True
)

# Data Collection Loop
computer.Update()  # Refresh all sensors
for hardware in computer.Hardware:
    for sensor in hardware.Sensors:
        # Process each sensor reading
        sensor_data = SensorData(
            id=generate_unique_id(hardware, sensor),
            name=sensor.Name,
            value=float(sensor.Value),
            unit=map_unit(sensor.SensorType),
            category=map_category(sensor.SensorType),
            source="LibreHardwareMonitor",
            min_value=sensor.Min,
            max_value=sensor.Max,
            parent=hardware.Name
        )
```

### 3. Sensor Data Structure

Each sensor is processed into a standardized `SensorData` object:

```python
class SensorData:
    id: str           # Unique identifier (e.g., "cpu_temperature_0")
    name: str         # Human-readable name (e.g., "CPU Package")
    value: float      # Current sensor reading
    unit: str         # Unit of measurement (°C, %, W, etc.)
    category: str     # Sensor type (temperature, load, power, etc.)
    source: str       # Data source identifier
    min_value: float  # Historical minimum value
    max_value: float  # Historical maximum value
    parent: str       # Hardware component name
    timestamp: str    # ISO timestamp of reading
```

### 4. Sensor Categories and Mapping

The system maps LibreHardwareMonitor sensor types to standardized categories:

```python
SENSOR_TYPE_MAPPING = {
    SensorType.Temperature: ("temperature", "°C"),
    SensorType.Load: ("load", "%"),
    SensorType.Power: ("power", "W"),
    SensorType.Fan: ("fan", "RPM"),
    SensorType.Voltage: ("voltage", "V"),
    SensorType.Clock: ("clock", "MHz"),
    SensorType.Data: ("data", "GB"),
    SensorType.Throughput: ("throughput", "B/s"),
    # ... more mappings
}
```

## Real-time Data Broadcasting

### 1. WebSocket Manager

The `WebSocketManager` class handles real-time communication:

```python
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def broadcast_sensor_data(self, sensor_data):
        message = {
            "type": "sensor_data",
            "timestamp": datetime.now().isoformat(),
            "sources": sensor_data
        }
        await self.broadcast(json.dumps(message))
```

### 2. Background Data Collection

The main application runs a continuous background task:

```python
async def broadcast_sensor_data():
    while True:
        # Collect data from all sensor sources
        all_sensor_data = {}
        
        for source_id, source_name, sensor_instance in sensor_sources:
            if sensor_instance.is_available():
                data = await sensor_instance.get_current_data()
                all_sensor_data[source_id] = {
                    "source": source_name,
                    "active": True,
                    "sensors": data,
                    "last_update": datetime.now().isoformat()
                }
        
        # Broadcast to all connected clients
        await websocket_manager.broadcast(json.dumps({
            "type": "sensor_data",
            "timestamp": datetime.now().isoformat(),
            "sources": all_sensor_data
        }))
        
        # Wait for next update (default: 2 seconds)
        await asyncio.sleep(settings.sensor_update_interval)
```

### 3. API Endpoints

#### Core Endpoints:
- `GET /api/sensors` - List all available sensor sources and their sensors
- `GET /api/sensors/current` - Get current readings from all sources
- `GET /api/sensors/hardware-tree` - Hierarchical view of hardware components
- `GET /api/debug/sensors` - Detailed debugging information
- `WebSocket /ws` - Real-time sensor data stream

## Frontend Integration

### 1. WebSocket Service

The frontend `WebSocketService` manages the connection:

```typescript
class WebSocketService {
    connect(url?: string): void {
        this.ws = new WebSocket(url || 'ws://localhost:8100/ws');
        this.setupEventListeners();
    }

    private handleMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'sensor_data':
                this.processSensorData(message.sources);
                break;
            // ... other message types
        }
    }
}
```

### 2. Store Management

Sensor data flows through Svelte stores:

```typescript
// Store definitions
export const sensorData = writable<Record<string, SensorData>>({});
export const availableSensors = writable<SensorInfo[]>([]);
export const connectionStatus = writable<ConnectionStatus>('disconnected');

// Update functions
export const storeUtils = {
    updateSensorData(newData: Record<string, SensorData>) {
        console.log('[Store] Updating sensor data:', Object.keys(newData).length, 'sensors');
        sensorData.set(newData);
    },
    
    updateSensorSources(sources: SensorSources) {
        const sensors: SensorInfo[] = [];
        for (const source of Object.values(sources)) {
            if (source.active && source.sensors) {
                for (const sensor of Object.values(source.sensors)) {
                    sensors.push({
                        id: sensor.id,
                        name: sensor.name,
                        category: sensor.category,
                        unit: sensor.unit,
                        source: source.id
                    });
                }
            }
        }
        availableSensors.set(sensors);
    }
};
```

### 3. Initial Data Loading

The main page loads sensor data on mount:

```typescript
onMount(async () => {
    // Try to load real sensor data first
    const sensorsResult = await apiService.getSensors();
    if (sensorsResult.success && sensorsResult.data) {
        storeUtils.updateSensorSources(sensorsResult.data.sources);
        
        // Create initial widgets from real data
        setTimeout(() => {
            createInitialWidgetsFromRealData();
        }, 500);
    } else {
        // Fallback to demo data if real sensors unavailable
        loadDemoData();
    }
});
```

### 4. Widget Integration

Widgets automatically bind to sensor data:

```typescript
// Widget configuration
interface WidgetConfig {
    id: string;
    sensor_id: string;    // Links to sensor data
    gauge_type: 'radial' | 'linear' | 'text';
    pos_x: number;
    pos_y: number;
    // ... other properties
}

// Reactive sensor value in widget
$: sensorValue = $sensorData[widget.sensor_id]?.value ?? 0;
$: sensorUnit = $sensorData[widget.sensor_id]?.unit ?? '';
```

## Data Flow Sequence

1. **Initialization**
   - Backend starts and initializes LibreHardwareMonitor
   - Hardware components are detected and sensors enumerated
   - WebSocket server starts listening

2. **Frontend Connection**
   - Frontend loads and establishes WebSocket connection
   - Initial sensor list is fetched via API
   - Available sensors populate the sidebar
   - Initial widgets are created from real sensor data

3. **Real-time Updates**
   - Backend collects sensor data every 2 seconds
   - Data is broadcast via WebSocket to all connected clients
   - Frontend receives updates and refreshes sensor stores
   - Widgets automatically update with new values

4. **Widget Management**
   - Users can create widgets linked to specific sensors
   - Widget configurations reference sensor IDs
   - Real-time data flows automatically to widgets
   - Visual updates happen reactively

## Configuration and Setup

### 1. Backend Requirements

```bash
# Required packages
pip install fastapi uvicorn websockets
pip install pythonnet              # For legacy implementation
pip install HardwareMonitor        # For updated implementation (recommended)
```

### 2. Admin Privileges

**Critical**: The backend must run with administrator privileges to access hardware sensors:

```batch
# Windows batch script
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Running with admin privileges
) else (
    powershell -Command "Start-Process cmd -ArgumentList '/c %0' -Verb runAs"
    exit /b
)
```

### 3. DLL Requirements (Legacy Only)

For the legacy implementation, `LibreHardwareMonitorLib.dll` must be present in the project root.

### 4. Error Handling

The system includes comprehensive error handling:

- **Connection failures**: Automatic reconnection with exponential backoff
- **Missing sensors**: Graceful degradation to demo data
- **Invalid readings**: Sensor validation and filtering
- **WebSocket issues**: Connection status monitoring and recovery

## Debugging and Monitoring

### 1. Debug Endpoints

- `GET /api/debug/sensors` - Detailed sensor information and counts
- WebSocket connection status in frontend
- Console logging throughout the data pipeline

### 2. Connection Status

The frontend displays real-time connection status:
- 🟢 Connected - Receiving real-time data
- 🟡 Connecting - Establishing connection
- 🔴 Disconnected - No connection to backend
- ❌ Error - Connection failed

### 3. Logging

```python
# Backend logging
logger.info(f"Collected {len(sensors)} sensors from LibreHardwareMonitor")
logger.error(f"Failed to initialize LibreHardwareMonitor: {e}")

# Frontend logging
console.log('[WebSocket] Received sensor_data message:', message);
console.log('[Store] Updating sensor data:', Object.keys(newData).length, 'sensors');
```

## Performance Considerations

### 1. Caching

- Backend caches sensor data for 1 second to avoid excessive DLL calls
- Frontend stores maintain current state to prevent unnecessary updates

### 2. Update Frequency

- Default update interval: 2 seconds (configurable)
- WebSocket broadcasts only when there are active connections
- Efficient JSON serialization for data transmission

### 3. Resource Management

- Proper cleanup of LibreHardwareMonitor resources on shutdown
- WebSocket connection management with stale connection cleanup
- Thread pool execution for synchronous DLL calls

## Troubleshooting

### Common Issues

1. **"LibreHardwareMonitor not available"**
   - Ensure admin privileges
   - Install required packages: `pip install HardwareMonitor`
   - Check Windows security software blocking access

2. **"WebSocket connection failed"**
   - Verify backend is running on port 8100
   - Check firewall settings
   - Ensure CORS configuration is correct

3. **"No sensor data"**
   - Confirm hardware monitoring is enabled in BIOS
   - Check if other monitoring software is blocking access
   - Verify sensor hardware compatibility

4. **"Demo data showing instead of real data"**
   - Backend may not be running with admin privileges
   - LibreHardwareMonitor initialization failed
   - Check server logs for error messages

### Testing Tools

Use the provided test scripts:

```bash
# Test backend connection and sensor data
python test_connection.py

# Start services with proper privileges (Windows full stack)
.\start_ultimon_full.ps1
```

## Security Considerations

- **Admin Privileges**: Required for hardware access, run backend as administrator
- **Network Access**: WebSocket connections should be secured in production
- **Data Validation**: All sensor data is validated before processing
- **Error Handling**: Sensitive system information is not exposed in error messages

This integration provides a robust, real-time hardware monitoring solution that bridges low-level hardware access with a modern web-based user interface. 