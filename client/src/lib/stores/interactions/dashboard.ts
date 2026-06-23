import { selectedWidgets, uiUtils, visualSettings, widgetGroups, widgets } from "$lib/stores";
import { widgetUtils } from "$lib/stores/data/widgets";
import { BatchCommand, MoveWidgetCommand, ResizeWidgetCommand, historyStore } from "$lib/stores/history";
import type { Point, Size, WidgetConfig } from "$lib/types";
import { clamp, roundToPrecision } from "$lib/utils/geometry";
import { logger } from "$lib/utils/logger";
import { derived, get, writable } from "svelte/store";
import { calculateSnap, type SnapGuide } from "./snap";

export type InteractionMode = "idle" | "dragging" | "resizing" | "selecting";

export interface InteractionState {
  mode: InteractionMode;
  activeWidgetIds: string[];
  startPositions: Record<string, Point>;
  startSizes: Record<string, Size>;
  pointerStart: Point;
  pointerCurrent: Point;
  activeHandle: string;
  snapGuides: SnapGuide[];
  hasLockedWidgets: boolean;
}

export interface SizeConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

function createDashboardInteractionStore() {
  const initialState: InteractionState = {
    mode: "idle",
    activeWidgetIds: [],
    startPositions: {},
    startSizes: {},
    pointerStart: { x: 0, y: 0 },
    pointerCurrent: { x: 0, y: 0 },
    activeHandle: "",
    snapGuides: [],
    hasLockedWidgets: false,
  };

  const { subscribe, set, update } = writable<InteractionState>(initialState);

  let updateThrottle: ReturnType<typeof setTimeout> | null = null;
  const throttleDelay = 16; // ~60fps

  function clearThrottle(): void {
    if (updateThrottle) {
      clearTimeout(updateThrottle);
      updateThrottle = null;
    }
  }

  function getSelectedWidgetIds(): string[] {
    const selection = get(selectedWidgets);
    return selection.type === "widget" ? selection.ids : [];
  }

  function getSelectedAndGroupedWidgetIds(widgetId: string): string[] {
    const selectedIds = getSelectedWidgetIds();
    const widgetsMap = get(widgets);
    const targetWidget = widgetsMap[widgetId];

    if (!targetWidget) return [widgetId];

    // If the target widget is part of a group and the selection is exactly the group's widgets,
    // move the whole group together.
    if (targetWidget.group_id && selectedIds.length > 0) {
      const groupId = targetWidget.group_id;
      const groups = get(widgetGroups);
      const group = groups[groupId];
      if (group && group.widgets.every((id) => selectedIds.includes(id))) {
        return group.widgets;
      }
    }

    // If the target is selected, move all selected widgets together.
    if (selectedIds.includes(widgetId)) {
      return selectedIds;
    }

    return [widgetId];
  }

  function recordStartState(widgetIds: string[]): {
    startPositions: Record<string, Point>;
    startSizes: Record<string, Size>;
    hasLockedWidgets: boolean;
  } {
    const widgetsMap = get(widgets);
    const startPositions: Record<string, Point> = {};
    const startSizes: Record<string, Size> = {};
    let hasLockedWidgets = false;

    for (const id of widgetIds) {
      const widget = widgetsMap[id];
      if (widget) {
        startPositions[id] = { x: widget.pos_x, y: widget.pos_y };
        startSizes[id] = { width: widget.width, height: widget.height };
        if (widget.is_locked) {
          hasLockedWidgets = true;
        }
      }
    }

    return { startPositions, startSizes, hasLockedWidgets };
  }

  function startDrag(event: MouseEvent, widgetId: string): void {
    const widgetIds = getSelectedAndGroupedWidgetIds(widgetId);
    const { startPositions, startSizes, hasLockedWidgets } = recordStartState(widgetIds);

    if (hasLockedWidgets) {
      logger.debug("[DashboardInteraction] Drag blocked: selection contains locked widgets");
      return;
    }

    update((state) => ({
      ...state,
      mode: "dragging",
      activeWidgetIds: widgetIds,
      startPositions,
      startSizes,
      pointerStart: { x: event.clientX, y: event.clientY },
      pointerCurrent: { x: event.clientX, y: event.clientY },
      activeHandle: "",
      snapGuides: [],
      hasLockedWidgets: false,
    }));

    // Ensure the dragged widget is selected
    const selectedIds = getSelectedWidgetIds();
    if (!selectedIds.includes(widgetId) && widgetIds.length === 1) {
      uiUtils.selectWidget(widgetId, false);
    }
  }

  function updateDrag(event: MouseEvent): void {
    const state = get({ subscribe });
    if (state.mode !== "dragging" || state.activeWidgetIds.length === 0) return;

    if (updateThrottle) return;

    updateThrottle = setTimeout(() => {
      const currentState = get({ subscribe });
      if (currentState.mode !== "dragging") {
        clearThrottle();
        return;
      }

      const deltaX = event.clientX - currentState.pointerStart.x;
      const deltaY = event.clientY - currentState.pointerStart.y;
      const widgetsMap = get(widgets);
      const settings = get(visualSettings);
      const allWidgets = Object.values(widgetsMap);

      const primaryWidget = widgetsMap[currentState.activeWidgetIds[0]];
      if (!primaryWidget) {
        clearThrottle();
        return;
      }

      const newPrimaryX = currentState.startPositions[primaryWidget.id].x + deltaX;
      const newPrimaryY = currentState.startPositions[primaryWidget.id].y + deltaY;

      const snapResult = calculateSnap({
        gridSize: settings.grid_size,
        snapToGrid: settings.snap_to_grid,
        snapDistance: 10,
        activeWidgetId: primaryWidget.id,
        widgets: allWidgets,
        startX: newPrimaryX,
        startY: newPrimaryY,
        width: primaryWidget.width,
        height: primaryWidget.height,
      });

      const snapDeltaX = snapResult.x - newPrimaryX;
      const snapDeltaY = snapResult.y - newPrimaryY;

      for (const id of currentState.activeWidgetIds) {
        const widget = widgetsMap[id];
        const startPos = currentState.startPositions[id];
        if (!widget || !startPos) continue;

        let newX = startPos.x + deltaX + snapDeltaX;
        let newY = startPos.y + deltaY + snapDeltaY;

        // Constrain to canvas bounds (non-negative)
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        widgetUtils.updateWidget(id, {
          pos_x: roundToPrecision(newX, 1),
          pos_y: roundToPrecision(newY, 1),
        });
      }

      update((s) => ({
        ...s,
        pointerCurrent: { x: event.clientX, y: event.clientY },
        snapGuides: snapResult.guides,
      }));

      clearThrottle();
    }, throttleDelay);
  }

  function endDrag(): void {
    clearThrottle();

    const state = get({ subscribe });
    if (state.mode !== "dragging" || state.activeWidgetIds.length === 0) {
      set(initialState);
      return;
    }

    const widgetsMap = get(widgets);
    const commands: MoveWidgetCommand[] = [];

    for (const id of state.activeWidgetIds) {
      const widget = widgetsMap[id];
      const startPos = state.startPositions[id];
      if (!widget || !startPos) continue;

      const newPos = { x: widget.pos_x, y: widget.pos_y };
      if (newPos.x !== startPos.x || newPos.y !== startPos.y) {
        commands.push(
          new MoveWidgetCommand(id, startPos, newPos, widgetUtils.updateWidget),
        );
      }
    }

    if (commands.length > 0) {
      historyStore.executeCommand(
        new BatchCommand(commands, `Move ${commands.length} widget${commands.length === 1 ? "" : "s"}`),
      );
    }

    set(initialState);
  }

  function startResize(event: MouseEvent, widgetId: string, handle: string, _constraints: SizeConstraints): void {
    const widgetIds = getSelectedWidgetIds();
    const targetWidget = get(widgets)[widgetId];
    if (!targetWidget || targetWidget.is_locked) return;

    // Only resize the primary widget when a single widget is selected.
    // Multi-resize is not supported in this phase to avoid complex interactions.
    const activeIds = widgetIds.includes(widgetId) && widgetIds.length === 1 ? widgetIds : [widgetId];
    const { startPositions, startSizes, hasLockedWidgets } = recordStartState(activeIds);

    if (hasLockedWidgets) return;

    update((state) => ({
      ...state,
      mode: "resizing",
      activeWidgetIds: activeIds,
      startPositions,
      startSizes,
      pointerStart: { x: event.clientX, y: event.clientY },
      pointerCurrent: { x: event.clientX, y: event.clientY },
      activeHandle: handle,
      snapGuides: [],
      hasLockedWidgets: false,
    }));

    uiUtils.selectWidget(widgetId, false);
  }

  function updateResize(event: MouseEvent, shiftKey: boolean): void {
    const state = get({ subscribe });
    if (state.mode !== "resizing" || state.activeWidgetIds.length !== 1) return;

    if (updateThrottle) return;

    updateThrottle = setTimeout(() => {
      const currentState = get({ subscribe });
      if (currentState.mode !== "resizing") {
        clearThrottle();
        return;
      }

      const widgetId = currentState.activeWidgetIds[0];
      const widget = get(widgets)[widgetId];
      const startSize = currentState.startSizes[widgetId];
      const startPos = currentState.startPositions[widgetId];
      if (!widget || !startSize || !startPos) {
        clearThrottle();
        return;
      }

      const deltaX = event.clientX - currentState.pointerStart.x;
      const deltaY = event.clientY - currentState.pointerStart.y;
      const handle = currentState.activeHandle;

      let newWidth = startSize.width;
      let newHeight = startSize.height;
      let newX = startPos.x;
      let newY = startPos.y;

      const aspectRatio = startSize.width / startSize.height;

      switch (handle) {
        case "nw":
          newWidth = startSize.width - deltaX;
          newHeight = shiftKey ? newWidth / aspectRatio : startSize.height - deltaY;
          newX = startPos.x + deltaX;
          newY = startPos.y + deltaY;
          break;
        case "n":
          newHeight = startSize.height - deltaY;
          newY = startPos.y + deltaY;
          break;
        case "ne":
          newWidth = startSize.width + deltaX;
          newHeight = shiftKey ? newWidth / aspectRatio : startSize.height - deltaY;
          newY = startPos.y + deltaY;
          break;
        case "e":
          newWidth = startSize.width + deltaX;
          break;
        case "se":
          newWidth = startSize.width + deltaX;
          newHeight = shiftKey ? newWidth / aspectRatio : startSize.height + deltaY;
          break;
        case "s":
          newHeight = startSize.height + deltaY;
          break;
        case "sw":
          newWidth = startSize.width - deltaX;
          newHeight = shiftKey ? newWidth / aspectRatio : startSize.height + deltaY;
          newX = startPos.x + deltaX;
          break;
        case "w":
          newWidth = startSize.width - deltaX;
          newX = startPos.x + deltaX;
          break;
      }

      // Apply minimum constraints
      const minSize = 60;
      if (newWidth < minSize) {
        if (handle.includes("w")) {
          newX = startPos.x + (startSize.width - minSize);
        }
        newWidth = minSize;
      }
      if (newHeight < minSize) {
        if (handle.includes("n")) {
          newY = startPos.y + (startSize.height - minSize);
        }
        newHeight = minSize;
      }

      // Snap to grid for position and size when enabled
      const settings = get(visualSettings);
      if (settings.snap_to_grid && settings.grid_size > 0) {
        const gridSize = settings.grid_size;
        if (handle.includes("w") || handle.includes("n")) {
          const snappedX = Math.round(newX / gridSize) * gridSize;
          const snappedY = Math.round(newY / gridSize) * gridSize;
          newWidth = newWidth + (newX - snappedX);
          newHeight = newHeight + (newY - snappedY);
          newX = snappedX;
          newY = snappedY;
        }
        newWidth = Math.round(newWidth / gridSize) * gridSize;
        newHeight = Math.round(newHeight / gridSize) * gridSize;
      }

      const updatePayload: Partial<WidgetConfig> = {
        width: clamp(Math.round(newWidth), minSize, 800),
        height: clamp(Math.round(newHeight), minSize, 600),
      };

      if (handle.includes("w") || handle.includes("n")) {
        updatePayload.pos_x = Math.max(0, Math.round(newX));
        updatePayload.pos_y = Math.max(0, Math.round(newY));
      }

      widgetUtils.updateWidget(widgetId, updatePayload);

      update((s) => ({
        ...s,
        pointerCurrent: { x: event.clientX, y: event.clientY },
      }));

      clearThrottle();
    }, throttleDelay);
  }

  function endResize(): void {
    clearThrottle();

    const state = get({ subscribe });
    if (state.mode !== "resizing" || state.activeWidgetIds.length !== 1) {
      set(initialState);
      return;
    }

    const widgetId = state.activeWidgetIds[0];
    const widget = get(widgets)[widgetId];
    const startSize = state.startSizes[widgetId];
    const startPos = state.startPositions[widgetId];

    if (widget && startSize && startPos) {
      const newSize = { width: widget.width, height: widget.height };
      const newPos = { x: widget.pos_x, y: widget.pos_y };

      const sizeChanged = newSize.width !== startSize.width || newSize.height !== startSize.height;
      const posChanged = newPos.x !== startPos.x || newPos.y !== startPos.y;

      if (sizeChanged || posChanged) {
        const commands: (MoveWidgetCommand | ResizeWidgetCommand)[] = [];
        if (posChanged) {
          commands.push(new MoveWidgetCommand(widgetId, startPos, newPos, widgetUtils.updateWidget));
        }
        if (sizeChanged) {
          commands.push(new ResizeWidgetCommand(widgetId, startSize, newSize, widgetUtils.updateWidget));
        }
        historyStore.executeCommand(new BatchCommand(commands, "Resize widget"));
      }
    }

    set(initialState);
  }

  function cancelInteraction(): void {
    clearThrottle();
    set(initialState);
  }

  return {
    subscribe,
    set,
    update,
    startDrag,
    updateDrag,
    endDrag,
    startResize,
    updateResize,
    endResize,
    cancelInteraction,
  };
}

export const dashboardInteraction = createDashboardInteractionStore();

export const activeSnapGuides = derived(dashboardInteraction, ($state) => $state.snapGuides);
export const isInteracting = derived(dashboardInteraction, ($state) => $state.mode !== "idle");
