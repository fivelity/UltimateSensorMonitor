/**
 * Configuration Service for Ultimate Sensor Monitor
 * Parses settings.cfg file and provides type-safe access to configuration values
 */

import settingsCfgRaw from "$lib/config/settings.cfg?raw";

export interface AppConfig {
  data: {
    useDemoData: boolean;
    autoCreateWidgets: boolean;
    maxWidgetsPerCategory: number;
  };
  ui: {
    defaultEditMode: "view" | "edit";
    showSplash: boolean;
    autoOpenLeftSidebar: boolean;
    autoOpenRightSidebar: boolean;
  };
  performance: {
    widgetUpdateThrottle: number;
    maxGraphPoints: number;
    enableHardwareAcceleration: boolean;
  };
  debug: {
    debugMode: boolean;
    showPerformanceMetrics: boolean;
    logSensorUpdates: boolean;
  };
  canvas: {
    defaultCanvasWidth: number;
    defaultCanvasHeight: number;
    defaultGridSize: number;
    defaultSnapToGrid: boolean;
    defaultShowGrid: boolean;
  };
  sensors: {
    connectionTimeout: number;
    maxRetryAttempts: number;
    updateInterval: number;
  };
  widgets: {
    defaultWidgetWidth: number;
    defaultWidgetHeight: number;
    minWidgetWidth: number;
    minWidgetHeight: number;
    maxWidgetWidth: number;
    maxWidgetHeight: number;
    widgetSpacing: number;
    widgetRowHeight: number;
    widgetsPerRow: number;
  };
}

class ConfigService {
  private config: AppConfig | null = null;
  private readonly defaultConfig: AppConfig = {
    data: {
      useDemoData: false,
      autoCreateWidgets: true,
      maxWidgetsPerCategory: 3,
    },
    ui: {
      defaultEditMode: "view",
      showSplash: true,
      autoOpenLeftSidebar: false,
      autoOpenRightSidebar: false,
    },
    performance: {
      widgetUpdateThrottle: 16,
      maxGraphPoints: 100,
      enableHardwareAcceleration: true,
    },
    debug: {
      debugMode: false,
      showPerformanceMetrics: false,
      logSensorUpdates: false,
    },
    canvas: {
      defaultCanvasWidth: 1920,
      defaultCanvasHeight: 1080,
      defaultGridSize: 10,
      defaultSnapToGrid: true,
      defaultShowGrid: false,
    },
    sensors: {
      connectionTimeout: 5000,
      maxRetryAttempts: 3,
      updateInterval: 1000,
    },
    widgets: {
      defaultWidgetWidth: 200,
      defaultWidgetHeight: 200,
      minWidgetWidth: 80,
      minWidgetHeight: 60,
      maxWidgetWidth: 800,
      maxWidgetHeight: 600,
      widgetSpacing: 250,
      widgetRowHeight: 250,
      widgetsPerRow: 4,
    },
  };

  /**
   * Load configuration from the bundled settings.cfg file
   * The file is imported as a raw string at build time so it works in both
   * development and production without relying on a public URL.
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      this.config = this.parseConfigFile(settingsCfgRaw);
      return this.config;
    } catch (error) {
      console.error("Error parsing configuration:", error);
      this.config = { ...this.defaultConfig };
      return this.config;
    }
  }

  /**
   * Parse the INI-style configuration file
   */
  private parseConfigFile(configText: string): AppConfig {
    const config = { ...this.defaultConfig };
    const lines = configText.split("\n");
    let currentSection = "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith("#") || !trimmedLine) {
        continue;
      }

      // Parse section headers
      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        currentSection = trimmedLine.slice(1, -1).toLowerCase();
        continue;
      }

      // Parse key-value pairs
      const equalIndex = trimmedLine.indexOf("=");
      if (equalIndex === -1) continue;

      const key = trimmedLine.slice(0, equalIndex).trim();
      const value = trimmedLine.slice(equalIndex + 1).trim();

      this.setConfigValue(config, currentSection, key, value);
    }

    return config;
  }

  /**
   * Set a configuration value with type conversion
   */
  private setConfigValue(
    config: AppConfig,
    section: string,
    key: string,
    value: string,
  ): void {
    const camelCaseKey = this.toCamelCase(key);

    type ConfigValue = string | number | boolean;
    let parsedValue: ConfigValue = value;

    // Convert string values to appropriate types
    if (value.toLowerCase() === "true") {
      parsedValue = true;
    } else if (value.toLowerCase() === "false") {
      parsedValue = false;
    } else if (!isNaN(Number(value))) {
      parsedValue = Number(value);
    }

    // Generic helper to safely assign a parsed value into a typed section
    function assign<T extends Record<string, ConfigValue>>(
      obj: T,
      k: string,
      v: ConfigValue,
    ): void {
      if (k in obj) {
        (obj as Record<string, ConfigValue>)[k] = v;
      }
    }

    // Set the value in the appropriate section
    switch (section) {
      case "data":
        assign(config.data, camelCaseKey, parsedValue);
        break;
      case "ui":
        assign(config.ui, camelCaseKey, parsedValue);
        break;
      case "performance":
        assign(config.performance, camelCaseKey, parsedValue);
        break;
      case "debug":
        assign(config.debug, camelCaseKey, parsedValue);
        break;
      case "canvas":
        assign(config.canvas, camelCaseKey, parsedValue);
        break;
      case "sensors":
        assign(config.sensors, camelCaseKey, parsedValue);
        break;
      case "widgets":
        assign(config.widgets, camelCaseKey, parsedValue);
        break;
    }
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }
    return this.config;
  }

  /**
   * Check if demo data should be used
   */
  shouldUseDemoData(): boolean {
    return this.getConfig().data.useDemoData;
  }

  /**
   * Check if widgets should be auto-created
   */
  shouldAutoCreateWidgets(): boolean {
    return this.getConfig().data.autoCreateWidgets;
  }

  /**
   * Get debug mode status
   */
  isDebugMode(): boolean {
    return this.getConfig().debug.debugMode;
  }

  /**
   * Get widget configuration
   */
  getWidgetConfig() {
    return this.getConfig().widgets;
  }

  /**
   * Get sensor configuration
   */
  getSensorConfig() {
    return this.getConfig().sensors;
  }

  /**
   * Get canvas configuration
   */
  getCanvasConfig() {
    return this.getConfig().canvas;
  }

  /**
   * Get UI configuration
   */
  getUIConfig() {
    return this.getConfig().ui;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return this.getConfig().performance;
  }
}

// Create singleton instance
export const configService = new ConfigService();
