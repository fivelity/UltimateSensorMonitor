import { writable } from "svelte/store";

export interface HardwareNode {
  id: string;
  name: string;
  type?: string;
  children?: HardwareNode[];
  sensors?: string[]; // sensor IDs
}

export const hardwareTree = writable<HardwareNode[]>([]);
