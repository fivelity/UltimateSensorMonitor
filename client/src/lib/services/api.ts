/**
 * API service for communicating with the backend
 */

import { logger } from "$lib/utils/logger";
import type {
    ApiHardwareNode,
    ApiResponse,
    DashboardPreset,
    SensorData,
    SensorSourceFromAPI,
    WidgetGroup,
} from "../types";

class ApiService {
  private baseUrl: string;
  private inflightGets = new Map<string, Promise<ApiResponse<unknown>>>();

  constructor() {
    this.baseUrl = "/api";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 10000,
  ): Promise<ApiResponse<T>> {
    // Deduplicate in-flight GET requests so multiple callers share one fetch.
    const isGet = !options.method || options.method === "GET";
    if (isGet) {
      const existing = this.inflightGets.get(endpoint);
      if (existing) {
        return existing as Promise<ApiResponse<T>>;
      }
    }

    const promise = this._doRequest<T>(endpoint, options, timeoutMs);
    if (isGet) {
      this.inflightGets.set(endpoint, promise as Promise<ApiResponse<unknown>>);
      promise.finally(() => this.inflightGets.delete(endpoint));
    }
    return promise;
  }

  private async _doRequest<T>(
    endpoint: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        logger.debug(`API request timed out for ${endpoint} (${timeoutMs}ms)`);
      } else {
        logger.error(`API request failed for ${endpoint}:`, error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Sensor endpoints
  async getSensors(): Promise<
    ApiResponse<{ sources: Record<string, SensorSourceFromAPI> }>
  > {
    // Use a longer timeout: the first call triggers hardware initialization
    // (LibreHardwareMonitor OpenComputer) which can take 15+ seconds.
    return this.request("/sensors", {}, 30000);
  }

  async getCurrentSensorData(): Promise<
    ApiResponse<{ timestamp: string; data: Record<string, SensorData> }>
  > {
    return this.request("/sensors/current");
  }

  async getHardwareTree(): Promise<
    ApiResponse<{ hardware: ApiHardwareNode[] }>
  > {
    return this.request("/sensors/hardware-tree", {}, 30000);
  }

  // Preset endpoints
  async getPresets(): Promise<ApiResponse<{ presets: string[] }>> {
    return this.request("/presets");
  }

  async getPreset(id: string): Promise<ApiResponse<DashboardPreset>> {
    return this.request(`/presets/${id}`);
  }

  async savePreset(
    preset: DashboardPreset,
  ): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.request("/presets", {
      method: "POST",
      body: JSON.stringify(preset),
    });
  }

  async deletePreset(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/presets/${id}`, {
      method: "DELETE",
    });
  }

  // Widget group endpoints
  async getWidgetGroups(): Promise<ApiResponse<{ groups: string[] }>> {
    return this.request("/widget-groups");
  }

  async getWidgetGroup(id: string): Promise<ApiResponse<WidgetGroup>> {
    return this.request(`/widget-groups/${id}`);
  }

  async saveWidgetGroup(
    group: WidgetGroup,
  ): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.request("/widget-groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch("/");
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
      if (
        preset &&
        typeof preset === "object" &&
        preset.name &&
        preset.widgets
      ) {
        return preset as DashboardPreset;
      }
      throw new Error("Invalid preset format");
    } catch (error) {
      logger.error("Failed to import preset:", error);
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
      if (group && typeof group === "object" && group.name && group.widgets) {
        return group as WidgetGroup;
      }
      throw new Error("Invalid widget group format");
    } catch (error) {
      logger.error("Failed to import widget group:", error);
      return null;
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();
