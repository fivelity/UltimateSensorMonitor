import { get } from 'svelte/store';
import { connectionStatus } from './connectionStatus';
import { sensorData } from './sensorData';
import { availableSensors } from './availableSensors';
import { sensorSources } from './sensorSources';
import { hardwareTree } from './hardwareTree';
import { visualSettings } from './core/visual';
import { editMode } from './core/ui';

/**
 * Initialize all stores with default values
 */
export async function initializeStores() {
  console.log('[StoreInitialization] Initializing all stores...');
  
  // Reset connection state
  connectionStatus.set('disconnected');
  
  // Clear sensor data
  sensorData.set({});
  availableSensors.set([]);
  sensorSources.set([]);
  hardwareTree.set([]);
  
  // Set default UI state
  editMode.set('view');
  
  console.log('[StoreInitialization] All stores initialized');
} 