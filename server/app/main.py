"""
Ultimate Sensor Monitor Reimagined - FastAPI Backend
Main application entry point with WebSocket support and API endpoints.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import os
from typing import Dict, List, Any
import logging
from datetime import datetime

from .config import settings
from .websockets import WebSocketManager
from .sensors.mock_sensor import MockSensor
from .sensors.librehardware_sensor import LibreHardwareSensor
from .sensors.librehardware_sensor_new import LibreHardwareSensorUpdated
from .sensors.hwinfo_sensor import HWiNFOSensor
from .models import DashboardPreset, WidgetGroup, SensorData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Ultimate Sensor Monitor Reimagined",
    description="Real-time hardware monitoring with customizable dashboards",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5501", "http://localhost:4173"],  # SvelteKit dev and preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers and sensors
websocket_manager = WebSocketManager()
mock_sensor = MockSensor()
librehw_sensor = LibreHardwareSensor()
librehw_sensor_updated = LibreHardwareSensorUpdated()  # New HardwareMonitor package implementation
hwinfo_sensor = HWiNFOSensor()

# Collect all available sensor sources
sensor_sources = [
    ("mock", "Mock Sensor Data", mock_sensor),
    ("librehardware", "LibreHardwareMonitor", librehw_sensor),
    ("librehardware_updated", "LibreHardwareMonitor Updated", librehw_sensor_updated),
    ("hwinfo", "HWiNFO64", hwinfo_sensor)
]

# In-memory storage for presets and widget groups (in production, use a database)
presets_storage: Dict[str, Dict] = {}
widget_groups_storage: Dict[str, Dict] = {}

# Ensure data directory exists
os.makedirs("data", exist_ok=True)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Ultimate Sensor Monitor Reimagined API", "version": "1.0.0"}


@app.get("/api/sensors")
async def get_available_sensors():
    """Get list of all available sensor sources and their sensors."""
    sources = {}
    
    for source_id, source_name, sensor_instance in sensor_sources:
        if sensor_instance.is_available():
            try:
                # Handle async sensors
                if hasattr(sensor_instance, 'get_available_sensors') and asyncio.iscoroutinefunction(sensor_instance.get_available_sensors):
                    sensors = await sensor_instance.get_available_sensors()
                else:
                    sensors = sensor_instance.get_available_sensors()
                    
                sources[source_id] = {
                    "id": source_id,
                    "name": source_name,
                    "active": True,
                    "sensors": sensors,
                    "last_update": datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Failed to get sensors from {source_name}: {e}")
                sources[source_id] = {
                    "id": source_id,
                    "name": source_name,
                    "active": False,
                    "sensors": [],
                    "error_message": f"Error getting sensors: {str(e)}"
                }
        else:
            sources[source_id] = {
                "id": source_id,
                "name": source_name,
                "active": False,
                "sensors": [],
                "error_message": "Sensor source not available"
            }
    
    return {"sources": sources}


@app.get("/api/sensors/current")
async def get_current_sensor_data():
    """Get current sensor data from all sources."""
    all_data = {}
    
    for source_id, source_name, sensor_instance in sensor_sources:
        if sensor_instance.is_available():
            try:
                # Handle async sensors
                if hasattr(sensor_instance, 'get_current_data') and asyncio.iscoroutinefunction(sensor_instance.get_current_data):
                    data = await sensor_instance.get_current_data()
                else:
                    data = sensor_instance.get_current_data()
                    
                all_data[source_id] = {
                    "source": source_name,
                    "active": True,
                    "sensors": data,
                    "last_update": datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Failed to get data from {source_name}: {e}")
                all_data[source_id] = {
                    "source": source_name,
                    "active": False,
                    "error": str(e),
                    "sensors": {}
                }
        else:
            all_data[source_id] = {
                "source": source_name,
                "active": False,
                "sensors": {}
            }
    
    return {
        "timestamp": datetime.now().isoformat(),
        "sources": all_data
    }


@app.get("/api/sensors/hardware-tree")
async def get_hardware_tree():
    """Get hierarchical view of hardware components and sensors (LibreHardwareMonitor Updated only)."""
    try:
        # Use the updated LibreHardwareMonitor implementation
        if librehw_sensor_updated.is_available():
            hardware_tree = await librehw_sensor_updated.get_hardware_tree()
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "hardware": hardware_tree
            }
        else:
            return {
                "success": False,
                "error": "LibreHardwareMonitor (Updated) is not available",
                "hardware": []
            }
    except Exception as e:
        logger.error(f"Failed to get hardware tree: {e}")
        return {
            "success": False,
            "error": str(e),
            "hardware": []
        }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time sensor data."""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                # Handle any client messages if needed
                logger.info(f"Received message: {message}")
            except asyncio.TimeoutError:
                # No message received, continue
                pass
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        websocket_manager.disconnect(websocket)


@app.get("/api/presets")
async def get_presets():
    """Get all saved dashboard presets."""
    return {"presets": list(presets_storage.keys())}


@app.post("/api/presets")
async def save_preset(preset: DashboardPreset):
    """Save a dashboard preset."""
    preset_id = preset.id or f"preset_{len(presets_storage) + 1}"
    preset_data = {
        "id": preset_id,
        "name": preset.name,
        "description": preset.description,
        "widgets": preset.widgets,
        "layout": preset.layout,
        "visual_settings": preset.visual_settings,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    presets_storage[preset_id] = preset_data
    
    # Also save to file for persistence
    try:
        with open(f"data/preset_{preset_id}.json", "w") as f:
            json.dump(preset_data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save preset to file: {e}")
    
    return {"message": "Preset saved successfully", "id": preset_id}


@app.get("/api/presets/{preset_id}")
async def get_preset(preset_id: str):
    """Get a specific preset by ID."""
    if preset_id not in presets_storage:
        # Try loading from file
        try:
            with open(f"data/preset_{preset_id}.json", "r") as f:
                preset_data = json.load(f)
                presets_storage[preset_id] = preset_data
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Preset not found")
    
    return presets_storage[preset_id]


@app.delete("/api/presets/{preset_id}")
async def delete_preset(preset_id: str):
    """Delete a preset."""
    if preset_id in presets_storage:
        del presets_storage[preset_id]
    
    # Also delete file
    try:
        os.remove(f"data/preset_{preset_id}.json")
    except FileNotFoundError:
        pass
    
    return {"message": "Preset deleted successfully"}


@app.post("/api/widget-groups")
async def save_widget_group(group: WidgetGroup):
    """Save a widget group for sharing."""
    group_id = group.id or f"group_{len(widget_groups_storage) + 1}"
    group_data = {
        "id": group_id,
        "name": group.name,
        "description": group.description,
        "widgets": group.widgets,
        "relative_positions": group.relative_positions,
        "created_at": datetime.now().isoformat()
    }
    
    widget_groups_storage[group_id] = group_data
    
    # Save to file
    try:
        with open(f"data/widget_group_{group_id}.json", "w") as f:
            json.dump(group_data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save widget group to file: {e}")
    
    return {"message": "Widget group saved successfully", "id": group_id}


@app.get("/api/widget-groups")
async def get_widget_groups():
    """Get all available widget groups."""
    return {"groups": list(widget_groups_storage.keys())}


@app.get("/api/widget-groups/{group_id}")
async def get_widget_group(group_id: str):
    """Get a specific widget group by ID."""
    if group_id not in widget_groups_storage:
        # Try loading from file
        try:
            with open(f"data/widget_group_{group_id}.json", "r") as f:
                group_data = json.load(f)
                widget_groups_storage[group_id] = group_data
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Widget group not found")
    
    return widget_groups_storage[group_id]


async def broadcast_sensor_data():
    """Background task to broadcast sensor data to all connected clients."""
    while True:
        try:
            # Get current sensor data from all sources
            all_sensor_data = {}
            
            for source_id, source_name, sensor_instance in sensor_sources:
                if sensor_instance.is_available():
                    try:
                        # Handle async sensors
                        if hasattr(sensor_instance, 'get_current_data') and asyncio.iscoroutinefunction(sensor_instance.get_current_data):
                            data = await sensor_instance.get_current_data()
                        else:
                            data = sensor_instance.get_current_data()
                            
                        all_sensor_data[source_id] = {
                            "source": source_name,
                            "active": True,
                            "sensors": data,
                            "last_update": datetime.now().isoformat()
                        }
                    except Exception as e:
                        logger.error(f"Failed to get data from {source_name}: {e}")
                        all_sensor_data[source_id] = {
                            "source": source_name,
                            "active": False,
                            "error": str(e),
                            "sensors": {}
                        }
            
            # Broadcast to all connected clients
            if websocket_manager.active_connections:
                message = {
                    "type": "sensor_data",
                    "timestamp": datetime.now().isoformat(),
                    "sources": all_sensor_data
                }
                await websocket_manager.broadcast(json.dumps(message))
            
            # Wait before next update (configurable update rate)
            await asyncio.sleep(settings.sensor_update_interval)
            
        except Exception as e:
            logger.error(f"Error in sensor data broadcast: {e}")
            await asyncio.sleep(1)


@app.on_event("startup")
async def startup_event():
    """Application startup tasks."""
    logger.info("Starting Ultimate Sensor Monitor Reimagined...")
    
    # Load existing presets from files
    try:
        for filename in os.listdir("data"):
            if filename.startswith("preset_") and filename.endswith(".json"):
                preset_id = filename.replace("preset_", "").replace(".json", "")
                with open(f"data/{filename}", "r") as f:
                    presets_storage[preset_id] = json.load(f)
                    
            elif filename.startswith("widget_group_") and filename.endswith(".json"):
                group_id = filename.replace("widget_group_", "").replace(".json", "")
                with open(f"data/{filename}", "r") as f:
                    widget_groups_storage[group_id] = json.load(f)
    except FileNotFoundError:
        pass
    
    # Start background task for sensor data broadcasting
    asyncio.create_task(broadcast_sensor_data())
    
    logger.info("Application startup complete!")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown tasks."""
    logger.info("Shutting down Ultimate Sensor Monitor Reimagined...")
    
    # Clean up sensor resources
    try:
        if hasattr(librehw_sensor, 'close'):
            librehw_sensor.close()
        logger.info("Sensor cleanup completed")
    except Exception as e:
        logger.error(f"Error during sensor cleanup: {e}")
    
    logger.info("Shutdown complete")


@app.get("/api/debug/sensors")
async def debug_sensors():
    """Debug endpoint to show detailed sensor information."""
    debug_info = {
        "sensor_sources": {},
        "total_sensors": 0,
        "categories": {}
    }
    
    for source_id, source_name, sensor_instance in sensor_sources:
        if sensor_instance.is_available():
            try:
                # Get current data
                if hasattr(sensor_instance, 'get_current_data') and asyncio.iscoroutinefunction(sensor_instance.get_current_data):
                    current_data = await sensor_instance.get_current_data()
                else:
                    current_data = sensor_instance.get_current_data()
                
                debug_info["sensor_sources"][source_id] = {
                    "name": source_name,
                    "active": True,
                    "sensor_count": len(current_data),
                    "sensors": current_data
                }
                
                debug_info["total_sensors"] += len(current_data)
                
                # Count categories
                for sensor_data in current_data.values():
                    category = sensor_data.get("category", "unknown")
                    if category not in debug_info["categories"]:
                        debug_info["categories"][category] = 0
                    debug_info["categories"][category] += 1
                    
            except Exception as e:
                debug_info["sensor_sources"][source_id] = {
                    "name": source_name,
                    "active": False,
                    "error": str(e)
                }
        else:
            debug_info["sensor_sources"][source_id] = {
                "name": source_name,
                "active": False,
                "error": "Source not available"
            }
    
    return debug_info


if __name__ == "__main__":
    import uvicorn
    print("Starting Ultimate Sensor Monitor Backend...")
    print("Server will be available at: http://localhost:8100")
    print("API documentation: http://localhost:8100/docs")
    print("WebSocket endpoint: ws://localhost:8100/ws")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8100,
        reload=False,
        log_level="info"
    ) 