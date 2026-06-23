import { writable } from "svelte/store";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export const connectionStatus = writable<ConnectionStatus>("disconnected");
