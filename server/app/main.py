"""
Ultimate Sensor Monitor Reimagined - FastAPI Backend
Main application entry point with WebSocket support and API endpoints.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .exceptions import AppError
from .models import DashboardPreset, WidgetGroup
from .repositories.base import JsonFileRepository
from .schemas import (
    DebugSensorsResponse,
    ErrorResponse,
    HardwareTreeResponse,
    HealthResponse,
    MessageResponse,
    PresetListResponse,
    PresetResponse,
    PresetSaveResponse,
    ReadyResponse,
    SensorDataResponse,
    SensorsResponse,
    WidgetGroupListResponse,
    WidgetGroupResponse,
    WidgetGroupSaveResponse,
)
from .services import PresetService, SensorService, WidgetGroupService
from .sensors.base import BaseSensor
from .sensors.hwinfo_sensor import HWiNFOSensor
from .sensors.librehardware_sensor import LibreHardwareSensor
from .sensors.mock_sensor import MockSensor
from .websockets import WebSocketManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Shared application state (singletons managed outside FastAPI lifespan for reuse).
DATA_DIR = Path(settings.data_directory)
DATA_DIR.mkdir(parents=True, exist_ok=True)

preset_repository = JsonFileRepository(DATA_DIR, "preset")
widget_group_repository = JsonFileRepository(DATA_DIR, "widget_group")

preset_service = PresetService(preset_repository)
widget_group_service = WidgetGroupService(widget_group_repository)

websocket_manager = WebSocketManager(max_connections=settings.max_websocket_connections)

# Build the sensor source list based on the enabled flags in settings.
# Mock data is opt-in only so tests reflect real hardware behavior.
sensor_sources: list[tuple[str, str, BaseSensor]] = []

if settings.mock_sensor_enabled:
    mock_sensor = MockSensor()
    sensor_sources.append(("mock", "Mock Sensor Data", mock_sensor))

librehw_sensor: LibreHardwareSensor | None = None
if settings.libre_hardware_monitor_enabled:
    librehw_sensor = LibreHardwareSensor()
    sensor_sources.append(("librehardware", "LibreHardwareMonitor", librehw_sensor))

hwinfo_sensor: HWiNFOSensor | None = None
if settings.hwinfo_enabled:
    hwinfo_sensor = HWiNFOSensor()
    sensor_sources.append(("hwinfo", "HWiNFO64", hwinfo_sensor))

sensor_service = SensorService(sensor_sources)


def get_sensor_service() -> SensorService:
    """Dependency injection provider for the sensor service."""
    return sensor_service


def get_preset_service() -> PresetService:
    """Dependency injection provider for the preset service."""
    return preset_service


def get_widget_group_service() -> WidgetGroupService:
    """Dependency injection provider for the widget group service."""
    return widget_group_service


async def _broadcast_sensor_data(sensor_service: SensorService) -> None:
    """Background task: fetch sensor data and broadcast to WebSocket clients."""
    while True:
        try:
            current_data = await sensor_service.get_current_data()
            if websocket_manager.active_connections:
                await websocket_manager.broadcast_sensor_data(
                    json.loads(current_data.model_dump_json())["sources"]
                )
            await asyncio.sleep(settings.sensor_update_interval)
        except Exception as e:
            logger.error(f"Error in sensor data broadcast: {e}")
            await asyncio.sleep(1)


async def _websocket_cleanup() -> None:
    """Background task: periodically clean up stale WebSocket connections."""
    while True:
        try:
            await asyncio.sleep(60)
            await websocket_manager.cleanup_stale_connections()
        except Exception as e:
            logger.error(f"Error in WebSocket cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown tasks."""
    logger.info("Starting Ultimate Sensor Monitor Reimagined...")

    # Start sensor initialization in the background so the server can accept
    # connections immediately. OpenComputer (LibreHardwareMonitor) can take
    # 15+ seconds; API requests during init will return "not available" quickly
    # instead of blocking on the connection lock.
    init_tasks: list[asyncio.Task] = []
    for source_id, source_name, sensor in sensor_sources:
        if hasattr(sensor, "initialize"):
            logger.info(
                f"Scheduling initialization for sensor source: {source_name}..."
            )
            init_tasks.append(
                asyncio.create_task(
                    sensor.initialize(),
                    name=f"init-{source_id}",
                )
            )

    # Yield briefly so the background initialization tasks can start before
    # the server begins accepting requests. This ensures the connection lock
    # is acquired first, so API calls see "not available" instead of racing
    # to initialize the sensor themselves.
    if init_tasks:
        logger.info(
            f"Yielding to start {len(init_tasks)} background initialization task(s)"
        )
        await asyncio.sleep(0)
        logger.info("Background initialization tasks should now be running")

    broadcast_task = asyncio.create_task(_broadcast_sensor_data(sensor_service))
    cleanup_task = asyncio.create_task(_websocket_cleanup())

    logger.info(
        "Application startup complete! Sensor initialization running in background."
    )

    yield

    logger.info("Shutting down Ultimate Sensor Monitor Reimagined...")
    broadcast_task.cancel()
    cleanup_task.cancel()
    for task in init_tasks:
        task.cancel()

    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    for task in init_tasks:
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass

    for sensor in [librehw_sensor, hwinfo_sensor]:
        if sensor is None:
            continue
        try:
            close_method = getattr(sensor, "close", None)
            if close_method is not None:
                close_result = close_method()
                if asyncio.iscoroutine(close_result):
                    await close_result
        except Exception as e:
            logger.error(f"Error during sensor cleanup: {e}")

    logger.info("Shutdown complete")


app = FastAPI(
    title="Ultimate Sensor Monitor Reimagined",
    description="Real-time hardware monitoring with customizable dashboards",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sanitize_validation_errors(
    errors: list[dict[str, object]],
) -> list[dict[str, object]]:
    """Convert non-JSON-serializable values in error details to strings."""
    sanitized: list[dict[str, object]] = []
    for error in errors:
        clean: dict[str, object] = {}
        for key, value in error.items():
            if isinstance(value, dict):
                clean[key] = _sanitize_validation_errors([value])[0] if value else {}
            elif isinstance(value, list):
                clean[key] = [
                    (
                        str(item)
                        if not isinstance(item, (str, int, float, bool, type(None)))
                        else item
                    )
                    for item in value
                ]
            elif isinstance(value, BaseException):
                clean[key] = str(value)
            else:
                clean[key] = value
        sanitized.append(clean)
    return sanitized


async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert FastAPI/Pydantic validation errors to structured JSON responses."""
    logger.warning(f"Validation error: {exc} ({request.url.path})")
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="ValidationError",
            message="Request validation failed",
            details={"errors": _sanitize_validation_errors(exc.errors())},
        ).model_dump(),
    )


app.add_exception_handler(RequestValidationError, handle_validation_error)


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    """Convert application errors to structured JSON responses."""
    logger.warning(f"Application error: {exc.detail} ({request.url.path})")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.__class__.__name__,
            message=exc.detail,
            details=getattr(exc, "__dict__", None),
        ).model_dump(),
    )


@app.get("/", response_model=MessageResponse)
async def root() -> MessageResponse:
    """Root endpoint."""
    return MessageResponse(message="Ultimate Sensor Monitor Reimagined API v1.0.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
    )


@app.get("/ready", response_model=ReadyResponse)
async def ready(
    sensor_service: SensorService = Depends(get_sensor_service),
) -> ReadyResponse:
    """Readiness check endpoint."""
    available = await sensor_service.get_available_source_names()
    return ReadyResponse(
        status="ready" if available else "no_sensor_sources",
        available_sources=available,
    )


@app.get("/api/sensors", response_model=SensorsResponse)
async def get_available_sensors(
    sensor_service: SensorService = Depends(get_sensor_service),
) -> SensorsResponse:
    """Get all available sensor sources and their sensors."""
    return await sensor_service.get_available_sensors()


@app.get("/api/sensors/current", response_model=SensorDataResponse)
async def get_current_sensor_data(
    sensor_service: SensorService = Depends(get_sensor_service),
) -> SensorDataResponse:
    """Get current sensor readings from all sources."""
    return await sensor_service.get_current_data()


@app.get("/api/sensors/hardware-tree", response_model=HardwareTreeResponse)
async def get_hardware_tree(
    sensor_service: SensorService = Depends(get_sensor_service),
) -> HardwareTreeResponse:
    """Get hierarchical hardware tree from LibreHardwareMonitor (Updated)."""
    return await sensor_service.get_hardware_tree()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time sensor data."""
    connected = await websocket_manager.connect(websocket)
    if not connected:
        return

    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                logger.info(f"Received WebSocket message: {message}")
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                logger.info("WebSocket client disconnected")
                break
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected (outer)")
    except Exception as e:
        logger.warning(f"WebSocket endpoint error: {e}")
    finally:
        websocket_manager.disconnect(websocket)


@app.get("/api/presets", response_model=PresetListResponse)
async def get_presets(
    service: PresetService = Depends(get_preset_service),
) -> PresetListResponse:
    """List all saved dashboard presets."""
    return service.list_presets()


@app.post("/api/presets", response_model=PresetSaveResponse, status_code=201)
async def save_preset(
    preset: DashboardPreset,
    service: PresetService = Depends(get_preset_service),
) -> PresetSaveResponse:
    """Save a dashboard preset."""
    return service.save_preset(preset)


@app.get("/api/presets/{preset_id}", response_model=PresetResponse)
async def get_preset(
    preset_id: str,
    service: PresetService = Depends(get_preset_service),
) -> PresetResponse:
    """Get a specific dashboard preset."""
    data = service.get_preset(preset_id)
    return PresetResponse(**data)


@app.delete("/api/presets/{preset_id}", response_model=MessageResponse)
async def delete_preset(
    preset_id: str,
    service: PresetService = Depends(get_preset_service),
) -> MessageResponse:
    """Delete a dashboard preset."""
    service.delete_preset(preset_id)
    return MessageResponse(message="Preset deleted successfully")


@app.get("/api/widget-groups", response_model=WidgetGroupListResponse)
async def get_widget_groups(
    service: WidgetGroupService = Depends(get_widget_group_service),
) -> WidgetGroupListResponse:
    """List all saved widget groups."""
    return service.list_groups()


@app.post("/api/widget-groups", response_model=WidgetGroupSaveResponse, status_code=201)
async def save_widget_group(
    group: WidgetGroup,
    service: WidgetGroupService = Depends(get_widget_group_service),
) -> WidgetGroupSaveResponse:
    """Save a widget group."""
    return service.save_group(group)


@app.get("/api/widget-groups/{group_id}", response_model=WidgetGroupResponse)
async def get_widget_group(
    group_id: str,
    service: WidgetGroupService = Depends(get_widget_group_service),
) -> WidgetGroupResponse:
    """Get a specific widget group."""
    data = service.get_group(group_id)
    return WidgetGroupResponse(**data)


@app.delete("/api/widget-groups/{group_id}", response_model=MessageResponse)
async def delete_widget_group(
    group_id: str,
    service: WidgetGroupService = Depends(get_widget_group_service),
) -> MessageResponse:
    """Delete a widget group."""
    service.delete_group(group_id)
    return MessageResponse(message="Widget group deleted successfully")


@app.get("/api/debug/sensors", response_model=DebugSensorsResponse)
async def debug_sensors(
    sensor_service: SensorService = Depends(get_sensor_service),
) -> DebugSensorsResponse:
    """Debug endpoint showing detailed sensor source information."""
    return await sensor_service.get_debug_info()


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
        log_level="info",
    )
