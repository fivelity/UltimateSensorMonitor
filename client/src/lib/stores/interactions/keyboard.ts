import { editMode, selectedWidgets, uiUtils, visualSettings, widgets } from "$lib/stores";
import { widgetUtils } from "$lib/stores/data/widgets";
import { AddWidgetCommand, BatchCommand, MoveWidgetCommand, RemoveWidgetCommand, historyStore } from "$lib/stores/history";
import { roundToPrecision } from "$lib/utils/geometry";
import { get } from "svelte/store";
import { dashboardInteraction } from "./dashboard";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isEditable =
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable;
  return isEditable;
}

function getSelectedWidgetIds(): string[] {
  const selection = get(selectedWidgets);
  return selection.type === "widget" ? selection.ids : [];
}

function nudgeWidgets(direction: "left" | "right" | "up" | "down", distance: number): void {
  const selectedIds = getSelectedWidgetIds();
  if (selectedIds.length === 0) return;

  const widgetsMap = get(widgets);
  const commands: MoveWidgetCommand[] = [];

  for (const id of selectedIds) {
    const widget = widgetsMap[id];
    if (!widget || widget.is_locked) continue;

    const oldPos = { x: widget.pos_x, y: widget.pos_y };
    let newPos = { ...oldPos };

    switch (direction) {
      case "left":
        newPos.x -= distance;
        break;
      case "right":
        newPos.x += distance;
        break;
      case "up":
        newPos.y -= distance;
        break;
      case "down":
        newPos.y += distance;
        break;
    }

    newPos.x = Math.max(0, roundToPrecision(newPos.x, 1));
    newPos.y = Math.max(0, roundToPrecision(newPos.y, 1));

    commands.push(new MoveWidgetCommand(id, oldPos, newPos, widgetUtils.updateWidget));
  }

  if (commands.length > 0) {
    historyStore.executeCommand(
      new BatchCommand(
        commands,
        `Nudge ${commands.length} widget${commands.length === 1 ? "" : "s"}`,
      ),
    );
  }
}

function duplicateSelectedWidgets(): void {
  const selectedIds = getSelectedWidgetIds();
  if (selectedIds.length === 0) return;

  const widgetsMap = get(widgets);
  const commands: AddWidgetCommand[] = [];
  const newIds: string[] = [];

  for (const id of selectedIds) {
    const widget = widgetsMap[id];
    if (!widget) continue;

    const newWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      pos_x: widget.pos_x + 20,
      pos_y: widget.pos_y + 20,
      z_index: widget.z_index + 1,
      group_id: undefined,
    };

    commands.push(new AddWidgetCommand(newWidget, widgetUtils.addWidget, widgetUtils.removeWidget));
    newIds.push(newWidget.id);
  }

  if (commands.length > 0) {
    historyStore.executeCommand(
      new BatchCommand(commands, `Duplicate ${commands.length} widget${commands.length === 1 ? "" : "s"}`),
    );
    selectedWidgets.set({ type: "widget", ids: newIds });
  }
}

function deleteSelectedWidgets(): void {
  const selectedIds = getSelectedWidgetIds();
  if (selectedIds.length === 0) return;

  const widgetsMap = get(widgets);
  const commands: RemoveWidgetCommand[] = [];

  for (const id of selectedIds) {
    const widget = widgetsMap[id];
    if (!widget) continue;
    commands.push(new RemoveWidgetCommand(widget, widgetUtils.addWidget, widgetUtils.removeWidget));
  }

  if (commands.length > 0) {
    historyStore.executeCommand(
      new BatchCommand(commands, `Delete ${commands.length} widget${commands.length === 1 ? "" : "s"}`),
    );
    uiUtils.clearSelection();
  }
}

function selectAllWidgets(): void {
  const widgetsMap = get(widgets);
  const allUnlockedIds = Object.values(widgetsMap)
    .filter((w) => !w.is_locked)
    .map((w) => w.id);

  if (allUnlockedIds.length > 0) {
    selectedWidgets.set({ type: "widget", ids: allUnlockedIds });
  }
}

export function handleKeyboardShortcut(event: KeyboardEvent): void {
  if (get(editMode) !== "edit") return;
  if (isEditableTarget(event.target)) return;
  if (get(dashboardInteraction).mode !== "idle") return;

  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;
  const _isAlt = event.altKey;

  // Undo / Redo
  if (isCtrl && (event.key === "z" || event.key === "Z")) {
    if (isShift) {
      event.preventDefault();
      historyStore.redo();
    } else {
      event.preventDefault();
      historyStore.undo();
    }
    return;
  }

  if (isCtrl && (event.key === "y" || event.key === "Y")) {
    event.preventDefault();
    historyStore.redo();
    return;
  }

  // Select all
  if (isCtrl && event.key === "a") {
    event.preventDefault();
    selectAllWidgets();
    return;
  }

  // Duplicate
  if (isCtrl && event.key === "d") {
    event.preventDefault();
    duplicateSelectedWidgets();
    return;
  }

  // Clear selection
  if (event.key === "Escape") {
    event.preventDefault();
    uiUtils.clearSelection();
    uiUtils.hideContextMenu();
    return;
  }

  // Delete
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelectedWidgets();
    return;
  }

  // Nudge
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const gridSize = get(visualSettings).grid_size;
    let distance = 1;
    if (isCtrl) {
      distance = 10;
    } else if (isShift) {
      distance = Math.max(gridSize, 1);
    }

    const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };

    event.preventDefault();
    nudgeWidgets(directionMap[event.key], distance);
    return;
  }
}

export function setupKeyboardShortcuts(): (_event: KeyboardEvent) => void {
  return handleKeyboardShortcut;
}
