/**
 * Sensor data store actions.
 * Centralizes sensor data, sensor sources, and hardware tree updates
 * so the root store index is just a composition of focused utilities.
 */

import { sensorData } from "../sensorData";
import { sensorSources } from "../sensorSources";
import { availableSensors } from "../availableSensors";
import { hardwareTree } from "../hardwareTree";
import type { HardwareNode } from "../hardwareTree";
import type {
  ApiHardwareNode,
  SensorData,
  SensorInfo,
  SensorSource,
  SensorSourceFromAPI,
} from "$lib/types";

export const sensorUtils = {
  updateSensorData: (data: Record<string, SensorData>) => {
    sensorData.set(data);
  },

  updateSensorSources: (
    apiPayload: Record<string, SensorSourceFromAPI> | null | undefined,
  ) => {
    let newAvailableSensors: SensorInfo[] = [];
    let newSensorSourcesForStore: SensorSource[] = [];

    if (apiPayload && typeof apiPayload === "object") {
      const sourcesFromAPIArray: SensorSourceFromAPI[] =
        Object.values(apiPayload);

      for (const sourceAPI of sourcesFromAPIArray) {
        if (
          sourceAPI &&
          sourceAPI.active &&
          sourceAPI.sensors &&
          typeof sourceAPI.sensors === "object"
        ) {
          const currentSourceSensors: SensorData[] = [];
          for (const sensor_data_item of Object.values(sourceAPI.sensors)) {
            if (sensor_data_item) {
              newAvailableSensors.push({
                id: sensor_data_item.id,
                name: sensor_data_item.name,
                category: sensor_data_item.category,
                unit: sensor_data_item.unit,
                source: sourceAPI.id,
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
            error_message: sourceAPI.error_message,
          });
        } else if (sourceAPI) {
          newSensorSourcesForStore.push({
            id: sourceAPI.id,
            name: sourceAPI.name,
            active: sourceAPI.active,
            sensors: [],
            last_update: sourceAPI.last_update,
            error_message: sourceAPI.error_message,
          });
        }
      }
    }

    sensorSources.set(newSensorSourcesForStore);
    availableSensors.set(newAvailableSensors);
  },

  updateHardwareTree: (
    tree: ApiHardwareNode[] | ApiHardwareNode | HardwareNode[] | HardwareNode,
  ) => {
    const treeArray = Array.isArray(tree) ? tree : tree ? [tree] : [];
    hardwareTree.set(treeArray as HardwareNode[]);
  },
};
