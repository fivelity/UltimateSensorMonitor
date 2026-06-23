import { writable } from "svelte/store";
import type { SensorData } from "$lib/types";

export const sensorData = writable<Record<string, SensorData>>({});
