/**
 * API service for communicating with the backend
 */

import type { DashboardPreset, WidgetGroup, ApiResponse, ApiHardwareNode, SensorData, SensorSourceFromAPI } from '../types';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Sensor endpoints
  async getSensors(): Promise<ApiResponse<{ sources: Record<string, SensorSourceFromAPI> }>> {
    return this.request('/sensors');
  }

  async getCurrentSensorData(): Promise<ApiResponse<{ timestamp: string; data: Record<string, SensorData> }>> {
    return this.request('/sensors/current');
  }

  async getHardwareTree(): Promise<ApiResponse<{ hardware: ApiHardwareNode[] }>> {
    return this.request('/sensors/hardware-tree');
  }

  // Preset endpoints
  async getPresets(): Promise<ApiResponse<{ presets: string[] }>> {
    return this.request('/presets');
  }

  async getPreset(id: string): Promise<ApiResponse<DashboardPreset>> {
    return this.request(`/presets/${id}`);
  }

  async savePreset(preset: DashboardPreset): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.request('/presets', {
      method: 'POST',
      body: JSON.stringify(preset),
    });
  }

  async deletePreset(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/presets/${id}`, {
      method: 'DELETE',
    });
  }

  // Widget group endpoints
  async getWidgetGroups(): Promise<ApiResponse<{ groups: string[] }>> {
    return this.request('/widget-groups');
  }

  async getWidgetGroup(id: string): Promise<ApiResponse<WidgetGroup>> {
    return this.request(`/widget-groups/${id}`);
  }

  async saveWidgetGroup(group: WidgetGroup): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.request('/widget-groups', {
      method: 'POST',
      body: JSON.stringify(group),
    });
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/');
      return response.ok;
    } catch {
      return false;
    }
  }

  async exportPreset(preset: DashboardPreset): Promise<string> {
    return JSON.stringify(preset, null, 2);
  }

  async importPreset(presetJson: string): Promise<DashboardPreset | null> {
    try {
      const preset = JSON.parse(presetJson);
      // Basic validation
      if (preset && typeof preset === 'object' && preset.name && preset.widgets) {
        return preset as DashboardPreset;
      }
      throw new Error('Invalid preset format');
    } catch (error) {
      console.error('Failed to import preset:', error);
      return null;
    }
  }

  async exportWidgetGroup(group: WidgetGroup): Promise<string> {
    return JSON.stringify(group, null, 2);
  }

  async importWidgetGroup(groupJson: string): Promise<WidgetGroup | null> {
    try {
      const group = JSON.parse(groupJson);
      // Basic validation
      if (group && typeof group === 'object' && group.name && group.widgets) {
        return group as WidgetGroup;
      }
      throw new Error('Invalid widget group format');
    } catch (error) {
      console.error('Failed to import widget group:', error);
      return null;
    }
  }
}

// Create singleton instance
export const apiService = new ApiService(); 