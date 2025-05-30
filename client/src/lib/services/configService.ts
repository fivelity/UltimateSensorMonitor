/**
 * Configuration Service for Ultimate Sensor Monitor
 * Parses settings.cfg file and provides type-safe access to configuration values
 */

export interface AppConfig {
  data: {
    useDemoData: boolean;
    autoCreateWidgets: boolean;
    maxWidgetsPerCategory: number;
  };
  ui: {
    defaultEditMode: 'view' | 'edit';
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
      defaultEditMode: 'view',
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
   * Load configuration from settings.cfg file
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const response = await fetch('/src/lib/config/settings.cfg');
      if (!response.ok) {
        console.warn('Failed to load settings.cfg, using default configuration');
        this.config = { ...this.defaultConfig };
        return this.config;
      }

      const configText = await response.text();
      this.config = this.parseConfigFile(configText);
      
      console.log('[ConfigService] Configuration loaded:', this.config);
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.config = { ...this.defaultConfig };
      return this.config;
    }
  }

  /**
   * Parse the INI-style configuration file
   */
  private parseConfigFile(configText: string): AppConfig {
    const config = { ...this.defaultConfig };
    const lines = configText.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || !trimmedLine) {
        continue;
      }

      // Parse section headers
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        currentSection = trimmedLine.slice(1, -1).toLowerCase();
        continue;
      }

      // Parse key-value pairs
      const equalIndex = trimmedLine.indexOf('=');
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
  private setConfigValue(config: AppConfig, section: string, key: string, value: string): void {
    const camelCaseKey = this.toCamelCase(key);
    
    let parsedValue: any = value;

    // Convert string values to appropriate types
    if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    } else if (!isNaN(Number(value))) {
      parsedValue = Number(value);
    }

    // Set the value in the appropriate section
    switch (section) {
      case 'data':
        if (camelCaseKey in config.data) {
          (config.data as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'ui':
        if (camelCaseKey in config.ui) {
          (config.ui as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'performance':
        if (camelCaseKey in config.performance) {
          (config.performance as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'debug':
        if (camelCaseKey in config.debug) {
          (config.debug as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'canvas':
        if (camelCaseKey in config.canvas) {
          (config.canvas as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'sensors':
        if (camelCaseKey in config.sensors) {
          (config.sensors as any)[camelCaseKey] = parsedValue;
        }
        break;
      case 'widgets':
        if (camelCaseKey in config.widgets) {
          (config.widgets as any)[camelCaseKey] = parsedValue;
        }
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
      throw new Error('Configuration not loaded. Call loadConfig() first.');
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