import { logger } from "$lib/utils/logger";
import { availableSensors } from "./availableSensors";
import { connectionStatus } from "./connectionStatus";
import { editMode } from "./core/ui";
import { hardwareTree } from "./hardwareTree";
import { sensorData } from "./sensorData";
import { sensorSources } from "./sensorSources";

/**
 * Initialize all stores with default values
 */
export async function initializeStores() {
  logger.debug("[StoreInitialization] Initializing all stores...");

  // Reset connection state
  connectionStatus.set("disconnected");

  // Clear sensor data
  sensorData.set({});
  availableSensors.set([]);
  sensorSources.set([]);
  hardwareTree.set([]);

  // Set default UI state
  editMode.set("view");

  logger.debug("[StoreInitialization] All stores initialized");
}
