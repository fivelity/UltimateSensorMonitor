import { writable } from 'svelte/store';
import type { SensorSource } from '$lib/types';

export const sensorSources = writable<SensorSource[]>([]); 