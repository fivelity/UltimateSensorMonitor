"""WebSocket manager for Ultimate Sensor Monitor Reimagined."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


@dataclass
class ConnectionMetadata:
    """Metadata tracked for each active WebSocket connection."""

    connected_at: datetime = field(default_factory=datetime.now)
    messages_sent: int = 0
    last_activity: datetime = field(default_factory=datetime.now)


class WebSocketManager:
    """Manages WebSocket connections and broadcasting."""

    def __init__(self, max_connections: int = 100, stale_timeout: int = 300):
        self.max_connections = max_connections
        self.stale_timeout = stale_timeout
        self.active_connections: set[WebSocket] = set()
        self.connection_metadata: dict[WebSocket, ConnectionMetadata] = {}

    async def connect(self, websocket: WebSocket) -> bool:
        """Accept a new WebSocket connection if capacity allows."""
        try:
            if len(self.active_connections) >= self.max_connections:
                logger.warning("WebSocket connection rejected: server at capacity")
                await websocket.close(code=1008, reason="Server at capacity")
                return False

            await websocket.accept()
            self.active_connections.add(websocket)
            self.connection_metadata[websocket] = ConnectionMetadata()
            logger.info(f"New WebSocket connection. Total: {len(self.active_connections)}/{self.max_connections}")

            welcome = {
                "type": "connection_established",
                "timestamp": datetime.now().isoformat(),
                "message": "Connected to Ultimate Sensor Monitor Reimagined",
            }
            await websocket.send_text(json.dumps(welcome))
            return True
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {e}")
            self.active_connections.discard(websocket)
            self.connection_metadata.pop(websocket, None)
            return False

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection and its metadata."""
        self.active_connections.discard(websocket)
        self.connection_metadata.pop(websocket, None)
        logger.info(f"WebSocket connection closed. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
            self._record_activity(websocket)
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.warning(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str) -> None:
        """Broadcast a message to all connected WebSocket clients."""
        if not self.active_connections:
            return

        tasks = [self._safe_send(connection, message) for connection in list(self.active_connections)]
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    logger.warning(f"Broadcast send failed: {result}")

    async def _safe_send(self, websocket: WebSocket, message: str) -> None:
        """Safely send a message to a WebSocket, handling disconnections."""
        try:
            await websocket.send_text(message)
            self._record_activity(websocket)
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.warning(f"Error sending message to WebSocket: {e}")
            self.disconnect(websocket)

    def _record_activity(self, websocket: WebSocket) -> None:
        """Update the last activity timestamp for a connection."""
        metadata = self.connection_metadata.get(websocket)
        if metadata:
            metadata.messages_sent += 1
            metadata.last_activity = datetime.now()

    async def broadcast_sensor_data(self, sensor_data: dict[str, Any]) -> None:
        """Broadcast sensor data to all connected clients."""
        message = {
            "type": "sensor_data",
            "timestamp": datetime.now().isoformat(),
            "sources": sensor_data,
        }
        await self.broadcast(json.dumps(message))

    async def broadcast_system_message(self, message_type: str, content: dict[str, Any]) -> None:
        """Broadcast a system message to all connected clients."""
        message = {
            "type": message_type,
            "timestamp": datetime.now().isoformat(),
            "content": content,
        }
        await self.broadcast(json.dumps(message))

    async def send_ping(self, websocket: WebSocket) -> bool:
        """Send a ping to keep a connection alive. Return False if it failed."""
        try:
            await websocket.send_text(json.dumps({"type": "ping", "timestamp": datetime.now().isoformat()}))
            return True
        except Exception as e:
            logger.debug(f"Ping failed for WebSocket: {e}")
            self.disconnect(websocket)
            return False

    def get_connection_stats(self) -> dict[str, Any]:
        """Return statistics about current connections."""
        total_connections = len(self.active_connections)
        total_messages_sent = sum(metadata.messages_sent for metadata in self.connection_metadata.values())

        return {
            "total_connections": total_connections,
            "total_messages_sent": total_messages_sent,
            "connections": [
                {
                    "connected_at": metadata.connected_at.isoformat(),
                    "messages_sent": metadata.messages_sent,
                    "last_activity": metadata.last_activity.isoformat(),
                }
                for metadata in self.connection_metadata.values()
            ],
        }

    async def cleanup_stale_connections(self) -> None:
        """Close connections that have not had recent activity."""
        current_time = datetime.now()
        stale_connections = [
            websocket
            for websocket, metadata in self.connection_metadata.items()
            if (current_time - metadata.last_activity).total_seconds() > self.stale_timeout
        ]

        for websocket in stale_connections:
            logger.info("Cleaning up stale WebSocket connection")
            self.disconnect(websocket)
            try:
                await websocket.close()
            except Exception:
                pass
