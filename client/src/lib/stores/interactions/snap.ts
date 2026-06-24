import type { WidgetConfig } from "$lib/types";
import { isNear, snapToGrid } from "$lib/utils/geometry";

export interface SnapGuide {
  type: "horizontal" | "vertical";
  position: number;
  widgets: string[];
  color: string;
  colorRgb: string;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapOptions {
  gridSize: number;
  snapToGrid: boolean;
  snapDistance: number;
  activeWidgetId: string;
  widgets: WidgetConfig[];
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const DEFAULT_SNAP_DISTANCE = 10;

function addToPositionMap(map: Map<number, string[]>, position: number, widgetId: string): void {
  const rounded = Math.round(position);
  if (!map.has(rounded)) {
    map.set(rounded, []);
  }
  map.get(rounded)!.push(widgetId);
}

export function getGuideColor(widgetCount: number): { color: string; colorRgb: string } {
  if (widgetCount >= 3) {
    return { color: "var(--theme-danger)", colorRgb: "var(--theme-danger-rgb)" };
  }
  if (widgetCount === 2) {
    return { color: "var(--theme-warning)", colorRgb: "var(--theme-warning-rgb)" };
  }
  return { color: "var(--theme-primary)", colorRgb: "var(--theme-primary-rgb)" };
}

export function calculateSnap(options: SnapOptions): SnapResult {
  const { gridSize, snapToGrid: enableGridSnap, snapDistance, activeWidgetId, widgets, startX, startY, width, height } = options;
  const distance = snapDistance ?? DEFAULT_SNAP_DISTANCE;

  const activeCenterX = startX + width / 2;
  const activeCenterY = startY + height / 2;
  const activeRightX = startX + width;
  const activeBottomY = startY + height;

  const otherWidgets = widgets.filter((w) => w.id !== activeWidgetId && !w.is_locked);

  let snappedX = startX;
  let snappedY = startY;
  let hasXSnap = false;
  let hasYSnap = false;
  const guides: SnapGuide[] = [];

  const xPositions = new Map<number, string[]>();
  const yPositions = new Map<number, string[]>();

  for (const widget of otherWidgets) {
    addToPositionMap(xPositions, widget.pos_x, widget.id);
    addToPositionMap(xPositions, widget.pos_x + widget.width, widget.id);
    addToPositionMap(xPositions, widget.pos_x + widget.width / 2, widget.id);

    addToPositionMap(yPositions, widget.pos_y, widget.id);
    addToPositionMap(yPositions, widget.pos_y + widget.height, widget.id);
    addToPositionMap(yPositions, widget.pos_y + widget.height / 2, widget.id);
  }

  // Widget snap - X axis
  for (const [position, widgetIds] of xPositions.entries()) {
    const { color, colorRgb } = getGuideColor(widgetIds.length);

    if (!hasXSnap && isNear(startX, position, distance)) {
      snappedX = position;
      hasXSnap = true;
      guides.push({ type: "vertical", position, widgets: widgetIds, color, colorRgb });
    } else if (!hasXSnap && isNear(activeRightX, position, distance)) {
      snappedX = position - width;
      hasXSnap = true;
      guides.push({ type: "vertical", position, widgets: widgetIds, color, colorRgb });
    } else if (!hasXSnap && isNear(activeCenterX, position, distance)) {
      snappedX = position - width / 2;
      hasXSnap = true;
      guides.push({ type: "vertical", position, widgets: widgetIds, color, colorRgb });
    }
  }

  // Widget snap - Y axis
  for (const [position, widgetIds] of yPositions.entries()) {
    const { color, colorRgb } = getGuideColor(widgetIds.length);

    if (!hasYSnap && isNear(startY, position, distance)) {
      snappedY = position;
      hasYSnap = true;
      guides.push({ type: "horizontal", position, widgets: widgetIds, color, colorRgb });
    } else if (!hasYSnap && isNear(activeBottomY, position, distance)) {
      snappedY = position - height;
      hasYSnap = true;
      guides.push({ type: "horizontal", position, widgets: widgetIds, color, colorRgb });
    } else if (!hasYSnap && isNear(activeCenterY, position, distance)) {
      snappedY = position - height / 2;
      hasYSnap = true;
      guides.push({ type: "horizontal", position, widgets: widgetIds, color, colorRgb });
    }
  }

  // Grid snap takes priority when no widget snap is active
  if (enableGridSnap && gridSize > 0) {
    if (!hasXSnap) {
      const gridX = snapToGrid(startX, gridSize);
      if (isNear(startX, gridX, distance)) {
        snappedX = gridX;
        hasXSnap = true;
      }
    }
    if (!hasYSnap) {
      const gridY = snapToGrid(startY, gridSize);
      if (isNear(startY, gridY, distance)) {
        snappedY = gridY;
        hasYSnap = true;
      }
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}

export function calculateResizeSnap(options: SnapOptions & { handle: string }): SnapResult {
  const { handle: _handle, ...rest } = options;
  const result = calculateSnap(rest);

  // For resize handles on the north/west edges, we need to adjust the snap target
  // to the edge being dragged rather than the widget's top-left origin.
  // The caller is responsible for translating edge snap back to size/position updates.
  return result;
}
