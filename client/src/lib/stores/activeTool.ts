/**
 * Active tool state for the redesigned Ultimon workspace.
 *
 * Replaces the legacy binary "edit/view" mode toggle with a richer set of
 * interaction tools (select, move, pan, add-widget) that drive canvas pointer
 * behavior. The legacy `editMode` store remains for backward compatibility —
 * "select"/"move"/"add" map to edit mode, "pan" maps to view mode.
 */

import type { EditMode, Point } from "$lib/types";
import { writable } from "svelte/store";
import { editMode } from "./core/ui";

export type ToolId = "select" | "move" | "pan" | "add";

export interface ToolDefinition {
  id: ToolId;
  /** Single character keyboard shortcut (case-insensitive) */
  shortcut: string;
  /** Maps to the legacy EditMode for components that still check it */
  editMode: EditMode;
}

export const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  select: { id: "select", shortcut: "v", editMode: "edit" },
  move: { id: "move", shortcut: "g", editMode: "edit" },
  pan: { id: "pan", shortcut: "h", editMode: "view" },
  add: { id: "add", shortcut: "a", editMode: "edit" },
};

export const TOOL_ORDER: ToolId[] = ["select", "move", "pan", "add"];

/**
 * When the "add" tool is used on the canvas, the click position is stored here
 * so the wizard can pre-set the widget placement location.
 */
export const pendingAddPosition = writable<Point | null>(null);

const STORAGE_KEY = "ultimon_active_tool";

function loadInitialTool(): ToolId {
  if (typeof window === "undefined") return "select";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && TOOL_DEFINITIONS[saved as ToolId]) {
      return saved as ToolId;
    }
  } catch {
    // Ignore corrupted storage.
  }
  return "select";
}

function persistTool(tool: ToolId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tool);
  } catch {
    // Ignore storage errors.
  }
}

function applyToolSideEffects(tool: ToolId): void {
  const def = TOOL_DEFINITIONS[tool];
  if (!def) return;
  editMode.set(def.editMode);
  persistTool(tool);
}

const initialTool = loadInitialTool();
applyToolSideEffects(initialTool);

const { subscribe, set, update } = writable<ToolId>(initialTool);

export const activeTool = {
  subscribe,

  /** Switch to a specific tool. */
  setTool: (tool: ToolId): void => {
    set(tool);
    applyToolSideEffects(tool);
  },

  /** Cycle to the next tool in TOOL_ORDER. */
  cycle: (): void => {
    update((current) => {
      const idx = TOOL_ORDER.indexOf(current);
      const next = TOOL_ORDER[(idx + 1) % TOOL_ORDER.length];
      applyToolSideEffects(next);
      return next;
    });
  },

  /** Handle a keyboard shortcut from a KeyboardEvent. Returns true if the key matched a tool. */
  handleShortcut: (event: KeyboardEvent): boolean => {
    if (event.ctrlKey || event.metaKey) return false;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return false;
    }

    const lower = event.key.toLowerCase();
    for (const def of Object.values(TOOL_DEFINITIONS)) {
      if (def.shortcut === lower) {
        activeTool.setTool(def.id);
        return true;
      }
    }
    return false;
  },
};
