// Store Exports - Centralized and Modular
// This file provides clean access to all stores while maintaining backward compatibility

// Active tool (redesigned toolbar: select / move / pan / add)
export {
    TOOL_DEFINITIONS,
    TOOL_ORDER, activeTool, pendingAddPosition, type ToolDefinition, type ToolId
} from "./activeTool.js";

// Core UI Stores
export {
    contextMenu,
    dragState, editMode,
    selectedWidgets, showLeftSidebar,
    showRightSidebar,
    uiUtils
} from "./core/ui.js";

// Visual Settings Store
export { visualSettings, visualUtils } from "./core/visual.js";

// Widget Data Stores
export {
    selectedWidgetConfigs, widgetArray, widgetCount, widgetGroups, widgetUtils, widgets
} from "./data/widgets.js";

// Dashboard Layout
export { dashboardLayout } from "./dashboardLayout.js";

// Grid-Snap Layout
export { gridLayout } from "./gridLayout.svelte.js";

// Dashboard Interaction Stores
export { alignWidgets, distributeWidgets } from "./interactions/align.js";
export {
    activeSnapGuides,
    dashboardInteraction,
    isInteracting
} from "./interactions/dashboard.js";
export { handleKeyboardShortcut, setupKeyboardShortcuts } from "./interactions/keyboard.js";
export { calculateSnap } from "./interactions/snap.js";

// Inspector UI state
export { inspectorStore, type RightSidebarTab } from "./inspector.js";

// Existing stores for backward compatibility
export { availableSensors } from "./availableSensors.js";
export { connectionStatus } from "./connectionStatus.js";
export { hardwareTree } from "./hardwareTree.js";
export { initializeStores } from "./initialization.js";
export { sensorData } from "./sensorData.js";
export { sensorSources } from "./sensorSources.js";

// Import utilities for focused domain actions
import { uiUtils } from "./core/ui.js";
import { visualUtils } from "./core/visual.js";
import { sensorUtils } from "./data/sensors.js";
import { widgetUtils } from "./data/widgets.js";

export { sensorUtils } from "./data/sensors.js";

// Deprecated: prefer importing the focused domain utilities directly.
export const storeUtils = {
  ...widgetUtils,
  ...uiUtils,
  ...visualUtils,
  ...sensorUtils,
};
