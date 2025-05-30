"""
WebSocket manager for Ultimate Sensor Monitor Reimagined.
Handles real-time communication with frontend clients.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasting."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            self.connection_metadata[websocket] = {
                "connected_at": datetime.now(),
                "messages_sent": 0,
                "last_activity": datetime.now()
            }
            logger.info(f"New WebSocket connection established. Total connections: {len(self.active_connections)}")
            
            # Send welcome message
            welcome_message = {
                "type": "connection_established",
                "timestamp": datetime.now().isoformat(),
                "message": "Connected to Ultimate Sensor Monitor Reimagined"
            }
            await websocket.send_text(json.dumps(welcome_message))
            
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {e}")
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        logger.info(f"WebSocket connection closed. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["messages_sent"] += 1
                self.connection_metadata[websocket]["last_activity"] = datetime.now()
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSocket clients."""
        if not self.active_connections:
            return
        
        # Send to all connections concurrently
        tasks = []
        for connection in self.active_connections.copy():  # Copy to avoid modification during iteration
            tasks.append(self._safe_send(connection, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _safe_send(self, websocket: WebSocket, message: str):
        """Safely send a message to a WebSocket, handling disconnections."""
        try:
            await websocket.send_text(message)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["messages_sent"] += 1
                self.connection_metadata[websocket]["last_activity"] = datetime.now()
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.warning(f"Error sending message to WebSocket: {e}")
            self.disconnect(websocket)
    
    async def broadcast_sensor_data(self, sensor_data: Dict[str, Any]):
        """Broadcast sensor data to all connected clients."""
        message = {
            "type": "sensor_data",
            "timestamp": datetime.now().isoformat(),
            "data": sensor_data
        }
        await self.broadcast(json.dumps(message))
    
    async def broadcast_system_message(self, message_type: str, content: Dict[str, Any]):
        """Broadcast a system message to all connected clients."""
        message = {
            "type": message_type,
            "timestamp": datetime.now().isoformat(),
            "content": content
        }
        await self.broadcast(json.dumps(message))
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about current connections."""
        total_connections = len(self.active_connections)
        total_messages_sent = sum(
            metadata.get("messages_sent", 0) 
            for metadata in self.connection_metadata.values()
        )
        
        return {
            "total_connections": total_connections,
            "total_messages_sent": total_messages_sent,
            "connections": [
                {
                    "connected_at": metadata["connected_at"].isoformat(),
                    "messages_sent": metadata["messages_sent"],
                    "last_activity": metadata["last_activity"].isoformat()
                }
                for metadata in self.connection_metadata.values()
            ]
        }
    
    async def cleanup_stale_connections(self):
        """Clean up stale WebSocket connections."""
        current_time = datetime.now()
        stale_connections = []
        
        for websocket, metadata in self.connection_metadata.items():
            # Consider connection stale if no activity for 5 minutes
            if (current_time - metadata["last_activity"]).total_seconds() > 300:
                stale_connections.append(websocket)
        
        for websocket in stale_connections:
            logger.info("Cleaning up stale WebSocket connection")
            self.disconnect(websocket)
            try:
                await websocket.close()
            except Exception:
                pass  # Connection might already be closed 