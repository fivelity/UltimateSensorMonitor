import { writable } from "svelte/store";
import type { SensorInfo } from "$lib/types";

export const availableSensors = writable<SensorInfo[]>([]);
