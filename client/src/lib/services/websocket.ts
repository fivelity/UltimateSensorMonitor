/**
 * WebSocket service for real-time sensor data communication
 */

import { get } from 'svelte/store';
import { connectionStatus, storeUtils } from '../stores';
import type { WebSocketMessage, SensorData, SensorSourceFromAPI } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionalClose = false;
  private url: string | null = null;

  constructor() {
    // Don't auto-connect in constructor to avoid SSR issues
  }

  connect(url?: string): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('WebSocket service not available in SSR environment');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Set the URL if provided, otherwise use default
    if (url) {
      this.url = url;
    } else if (!this.url) {
      // Default URL using current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${protocol}//${window.location.host}/ws`;
    }

    connectionStatus.set('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      connectionStatus.set('error');
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      connectionStatus.set('connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      connectionStatus.set('disconnected');
      
      if (!this.isIntentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      connectionStatus.set('error');
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connection_established':
        console.log('Connection established:', message.message);
        break;

      case 'sensor_data': {
        console.log('[WebSocket] Received sensor_data message:', message);

        const msgData = message as WebSocketMessage & { sources?: Record<string, SensorSourceFromAPI> };
        const sources = msgData.sources ?? (msgData.data as { sources?: Record<string, SensorSourceFromAPI> } | undefined)?.sources;

        if (sources) {
          const allSensorReadings: Record<string, SensorData> = {};

          for (const sourceKey in sources) {
            const source = sources[sourceKey];
            console.log(`[WebSocket] Processing source ${sourceKey}:`, source);

            if (source.active && source.sensors) {
              for (const sensorId in source.sensors) {
                const reading = source.sensors[sensorId];
                allSensorReadings[sensorId] = {
                  ...reading,
                  source: sourceKey,
                  timestamp: reading.timestamp ?? new Date().toISOString()
                };
              }
            }
          }

          console.log('[WebSocket] Processed sensor readings:', allSensorReadings);
          console.log('[WebSocket] Total sensors processed:', Object.keys(allSensorReadings).length);
          storeUtils.updateSensorData(allSensorReadings);
        } else {
          console.warn('[WebSocket] Sensor data message missing expected structure:', message);
        }
        break;
      }

      case 'sensor_sources_updated':
        if (message.content) {
          storeUtils.updateSensorSources(message.content as Record<string, SensorSourceFromAPI>);
        }
        break;

      case 'error':
        console.error('Server error:', message.content);
        break;

      default:
        console.log('Unknown message type:', message.type, message);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      connectionStatus.set('error');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    connectionStatus.set('disconnected');
  }

  reconnect(): void {
    this.disconnect();
    this.isIntentionalClose = false;
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 100);
  }

  getConnectionState(): string {
    return get(connectionStatus);
  }

  // Method to subscribe to WebSocket messages (for backward compatibility)
  subscribe(callback: (message: WebSocketMessage) => void): () => void {
    // This could be implemented with a proper event emitter
    // For now, we'll use the existing store-based approach
    const originalHandleMessage = this.handleMessage.bind(this);
    
    this.handleMessage = (message: WebSocketMessage) => {
      originalHandleMessage(message);
      callback(message);
    };

    // Return unsubscribe function
    return () => {
      this.handleMessage = originalHandleMessage;
    };
  }

  // Method to handle connection status changes (for backward compatibility)
  onConnectionChange(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void {
    // Subscribe to connection status changes
    const unsubscribe = connectionStatus.subscribe(callback);
    // Return the unsubscribe function (though we're not capturing it in the current usage)
    return unsubscribe;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when the module is imported (only in browser)
if (typeof window !== 'undefined') {
  // Connect when the page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && websocketService.getConnectionState() === 'disconnected') {
      websocketService.reconnect();
    }
  });

  // Connect when the page comes back online
  window.addEventListener('online', () => {
    if (websocketService.getConnectionState() !== 'connected') {
      websocketService.reconnect();
    }
  });

  // Disconnect when going offline
  window.addEventListener('offline', () => {
    websocketService.disconnect();
  });
} 