// Store Exports - Centralized and Modular
// This file provides clean access to all stores while maintaining backward compatibility

// Core UI Stores
export {
  editMode,
  selectedWidgets,
  contextMenu,
  dragState,
  showLeftSidebar,
  showRightSidebar,
  uiUtils
} from './core/ui.js';

// Visual Settings Store
export {
  visualSettings,
  visualUtils
} from './core/visual.js';

// Widget Data Stores
export {
  widgets,
  widgetGroups,
  widgetArray,
  selectedWidgetConfigs,
  widgetUtils
} from './data/widgets.js';

// Dashboard Layout
export { dashboardLayout } from './dashboardLayout.js';

// Existing stores for backward compatibility
export { connectionStatus } from './connectionStatus.js';
export { sensorData } from './sensorData.js';
export { availableSensors } from './availableSensors.js';
export { sensorSources } from './sensorSources.js';
export { hardwareTree } from './hardwareTree.js';
export { initializeStores } from './initialization.js';

// Import utilities for comprehensive storeUtils
import { widgetUtils } from './data/widgets.js';
import { uiUtils } from './core/ui.js';
import { visualUtils } from './core/visual.js';
import { sensorData } from './sensorData.js';
import { sensorSources } from './sensorSources.js';
import { availableSensors } from './availableSensors.js';
import { hardwareTree } from './hardwareTree.js';
import type { SensorData, SensorInfo, SensorSourceFromAPI, SensorSource } from '$lib/types';

// Comprehensive backward compatibility utilities
export const storeUtils = {
  // Widget management (from widgetUtils)
  ...widgetUtils,
  
  // UI management (from uiUtils)
  ...uiUtils,
  
  // Visual settings management (from visualUtils)
  updateVisualSettings: visualUtils.updateSettings,
  
  // Sensor data management
  updateSensorData: (data: Record<string, SensorData>) => {
    sensorData.set(data);
  },
  
  updateSensorSources: (apiPayload: Record<string, SensorSourceFromAPI> | null | undefined) => {
    let newAvailableSensors: SensorInfo[] = [];
    let newSensorSourcesForStore: SensorSource[] = [];

    if (apiPayload && typeof apiPayload === 'object') {
      const sourcesFromAPIArray: SensorSourceFromAPI[] = Object.values(apiPayload);
      
      for (const sourceAPI of sourcesFromAPIArray) {
        if (sourceAPI && sourceAPI.active && sourceAPI.sensors && typeof sourceAPI.sensors === 'object') {
          const currentSourceSensors: SensorData[] = [];
          for (const sensor_data_item of Object.values(sourceAPI.sensors)) {
            if (sensor_data_item) {
              newAvailableSensors.push({
                id: sensor_data_item.id,
                name: sensor_data_item.name,
                category: sensor_data_item.category,
                unit: sensor_data_item.unit,
                source: sourceAPI.id 
              });
              currentSourceSensors.push(sensor_data_item);
            }
          }
          newSensorSourcesForStore.push({
            id: sourceAPI.id,
            name: sourceAPI.name,
            active: sourceAPI.active,
            sensors: currentSourceSensors,
            last_update: sourceAPI.last_update,
            error_message: sourceAPI.error_message
          });
        } else if (sourceAPI) {
            newSensorSourcesForStore.push({
                id: sourceAPI.id,
                name: sourceAPI.name,
                active: sourceAPI.active,
                sensors: [],
                last_update: sourceAPI.last_update,
                error_message: sourceAPI.error_message
            });
        }
      }
    }
    
    sensorSources.set(newSensorSourcesForStore);
    availableSensors.set(newAvailableSensors);
  },
  
  updateHardwareTree: (tree: any[] | any) => {
    const treeArray = Array.isArray(tree) ? tree : (tree ? [tree] : []);
    hardwareTree.set(treeArray);
  }
}; 