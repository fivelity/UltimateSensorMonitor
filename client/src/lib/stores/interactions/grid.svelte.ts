import { editMode, selectedWidgets, uiUtils } from "$lib/stores/core/ui";
import { widgetGroups, widgetUtils, widgets } from "$lib/stores/data/widgets";
import { gridLayout } from "$lib/stores/gridLayout.svelte";
import {
    BatchCommand,
    MoveWidgetCommand,
    ResizeWidgetCommand,
    historyStore,
} from "$lib/stores/history";
import { getGuideColor, type SnapGuide } from "$lib/stores/interactions/snap";
import type { Point, Size, WidgetConfig, WidgetGroup } from "$lib/types";
import { roundToPrecision } from "$lib/utils/geometry";
import { get } from "svelte/store";

type InteractionMode = "idle" | "dragging" | "resizing";

type Direction = "left" | "right" | "up" | "down";

interface SnapCandidate {
  position: number;
  offset: number;
}

interface SnapTarget {
  position: number;
  widgetIds: string[];
}

interface SnapMatch {
  targetPosition: number;
  offset: number;
  guide: SnapGuide;
}

const MIN_SIZE = 32;
const SNAP_DISTANCE = 10;

function getSelectedWidgetIds(): string[] {
  const selection = get(selectedWidgets);
  return selection.type === "widget" ? selection.ids : [];
}

function getSelectedAndGroupedWidgetIds(
  widgetId: string,
  selectedIds: string[],
  widgetsMap: Record<string, WidgetConfig>,
  groups: Record<string, WidgetGroup>,
): string[] {
  const widget = widgetsMap[widgetId];
  if (!widget) return [widgetId];

  if (widget.group_id && selectedIds.length > 0) {
    const group = groups[widget.group_id];
    if (group && group.widgets.every((id) => selectedIds.includes(id))) {
      return group.widgets;
    }
  }

  if (selectedIds.includes(widgetId)) {
    return selectedIds;
  }

  return [widgetId];
}

function buildGridTargetsX(): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const { columns, originX, gridStepX } = gridLayout;
  for (let i = 0; i <= columns; i++) {
    targets.push({ position: originX + i * gridStepX, widgetIds: [] });
  }
  return targets;
}

function buildGridTargetsY(): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const { rows, originY, gridStepY } = gridLayout;
  for (let i = 0; i <= rows; i++) {
    targets.push({ position: originY + i * gridStepY, widgetIds: [] });
  }
  return targets;
}

function buildWidgetTargetsX(activeIds: string[]): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const widgetsMap = get(widgets);

  for (const widget of Object.values(widgetsMap)) {
    if (activeIds.includes(widget.id)) continue;
    const left = gridLayout.snapX(widget.pos_x);
    const width = gridLayout.snapWidth(widget.width);
    targets.push({ position: left, widgetIds: [widget.id] });
    targets.push({ position: left + width, widgetIds: [widget.id] });
    targets.push({ position: left + width / 2, widgetIds: [widget.id] });
  }

  return targets;
}

function buildWidgetTargetsY(activeIds: string[]): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const widgetsMap = get(widgets);

  for (const widget of Object.values(widgetsMap)) {
    if (activeIds.includes(widget.id)) continue;
    const top = gridLayout.snapY(widget.pos_y);
    const height = gridLayout.snapHeight(widget.height);
    targets.push({ position: top, widgetIds: [widget.id] });
    targets.push({ position: top + height, widgetIds: [widget.id] });
    targets.push({ position: top + height / 2, widgetIds: [widget.id] });
  }

  return targets;
}

function buildEqualSpacingTargetsX(activeIds: string[]): SnapTarget[] {
  const positions: number[] = [];
  for (const target of buildGridTargetsX()) {
    positions.push(target.position);
  }
  for (const target of buildWidgetTargetsX(activeIds)) {
    positions.push(target.position);
  }

  const targets: SnapTarget[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const distance = positions[j] - positions[i];
      targets.push({ position: positions[j] + distance, widgetIds: [] });
      targets.push({ position: positions[i] - distance, widgetIds: [] });
    }
  }

  return targets;
}

function buildEqualSpacingTargetsY(activeIds: string[]): SnapTarget[] {
  const positions: number[] = [];
  for (const target of buildGridTargetsY()) {
    positions.push(target.position);
  }
  for (const target of buildWidgetTargetsY(activeIds)) {
    positions.push(target.position);
  }

  const targets: SnapTarget[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const distance = positions[j] - positions[i];
      targets.push({ position: positions[j] + distance, widgetIds: [] });
      targets.push({ position: positions[i] - distance, widgetIds: [] });
    }
  }

  return targets;
}

class GridInteractionState {
  mode = $state<InteractionMode>("idle");
  activeWidgetIds = $state<string[]>([]);
  startPositions = $state<Record<string, Point>>({});
  startSizes = $state<Record<string, Size>>({});
  pointerStart = $state<Point>({ x: 0, y: 0 });
  activeHandle = $state<string>("");
  snapGuides = $state<SnapGuide[]>([]);

  private moveHandler?: (event: PointerEvent) => void;
  private upHandler?: (event: PointerEvent) => void;

  private getSnapThreshold(): number {
    const stepX = Math.max(1, gridLayout.gridStepX);
    const stepY = Math.max(1, gridLayout.gridStepY);
    return Math.min(SNAP_DISTANCE, stepX / 2, stepY / 2);
  }

  private findSnap(
    candidates: SnapCandidate[],
    targets: SnapTarget[],
    guideType: "vertical" | "horizontal",
  ): SnapMatch | null {
    const threshold = this.getSnapThreshold();
    let best: { candidate: SnapCandidate; target: SnapTarget } | null = null;
    let bestDistance = threshold;

    for (const candidate of candidates) {
      for (const target of targets) {
        const distance = Math.abs(candidate.position - target.position);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { candidate, target };
        }
      }
    }

    if (!best) return null;

    const color = getGuideColor(best.target.widgetIds.length || 1);
    return {
      targetPosition: best.target.position,
      offset: best.candidate.offset,
      guide: {
        type: guideType,
        position: best.target.position,
        widgets: best.target.widgetIds,
        color: color.color,
        colorRgb: color.colorRgb,
      },
    };
  }

  private snapDrag(
    rawX: number,
    rawY: number,
    widget: WidgetConfig,
  ): { x: number; y: number; guides: SnapGuide[] } {
    const width = gridLayout.snapWidth(widget.width);
    const height = gridLayout.snapHeight(widget.height);

    const targetsX = [
      ...buildGridTargetsX(),
      ...buildWidgetTargetsX(this.activeWidgetIds),
      ...buildEqualSpacingTargetsX(this.activeWidgetIds),
    ];
    const targetsY = [
      ...buildGridTargetsY(),
      ...buildWidgetTargetsY(this.activeWidgetIds),
      ...buildEqualSpacingTargetsY(this.activeWidgetIds),
    ];

    const matchX = this.findSnap(
      [
        { position: rawX, offset: 0 },
        { position: rawX + width, offset: width },
        { position: rawX + width / 2, offset: width / 2 },
      ],
      targetsX,
      "vertical",
    );
    const matchY = this.findSnap(
      [
        { position: rawY, offset: 0 },
        { position: rawY + height, offset: height },
        { position: rawY + height / 2, offset: height / 2 },
      ],
      targetsY,
      "horizontal",
    );

    const guides: SnapGuide[] = [];
    let x = rawX;
    let y = rawY;

    if (matchX) {
      x = matchX.targetPosition - matchX.offset;
      guides.push(matchX.guide);
    }
    if (matchY) {
      y = matchY.targetPosition - matchY.offset;
      guides.push(matchY.guide);
    }

    return { x, y, guides };
  }

  private recordStartState(widgetIds: string[]): void {
    const widgetsMap = get(widgets);
    const positions: Record<string, Point> = {};
    const sizes: Record<string, Size> = {};

    for (const id of widgetIds) {
      const widget = widgetsMap[id];
      if (widget) {
        positions[id] = { x: widget.pos_x, y: widget.pos_y };
        sizes[id] = { width: widget.width, height: widget.height };
      }
    }

    this.startPositions = positions;
    this.startSizes = sizes;
  }

  private attachListeners(): void {
    this.moveHandler = (event: PointerEvent) => this.handlePointerMove(event);
    this.upHandler = (event: PointerEvent) => this.handlePointerUp(event);
    window.addEventListener("pointermove", this.moveHandler);
    window.addEventListener("pointerup", this.upHandler);
  }

  private detachListeners(): void {
    if (this.moveHandler) {
      window.removeEventListener("pointermove", this.moveHandler);
    }
    if (this.upHandler) {
      window.removeEventListener("pointerup", this.upHandler);
    }
    this.moveHandler = undefined;
    this.upHandler = undefined;
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.mode === "dragging") {
      this.updateDrag(event);
    } else if (this.mode === "resizing") {
      this.updateResize(event);
    }
  }

  private handlePointerUp(_event: PointerEvent): void {
    this.detachListeners();
    if (this.mode === "dragging") {
      this.endDrag();
    } else if (this.mode === "resizing") {
      this.endResize();
    }
  }

  private updateDrag(event: PointerEvent): void {
    if (this.activeWidgetIds.length === 0) return;

    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    const widgetsMap = get(widgets);
    const primaryId = this.activeWidgetIds[0];
    const primary = widgetsMap[primaryId];
    const primaryStart = this.startPositions[primaryId];
    if (!primary || !primaryStart) return;

    const rawX = primaryStart.x + deltaX;
    const rawY = primaryStart.y + deltaY;
    const { x: snappedX, y: snappedY, guides } = this.snapDrag(rawX, rawY, primary);

    const snapDeltaX = snappedX - rawX;
    const snapDeltaY = snappedY - rawY;

    for (const id of this.activeWidgetIds) {
      const widget = widgetsMap[id];
      const startPos = this.startPositions[id];
      if (!widget || !startPos) continue;

      let newX = startPos.x + deltaX + snapDeltaX;
      let newY = startPos.y + deltaY + snapDeltaY;
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      widgetUtils.updateWidget(id, {
        pos_x: roundToPrecision(newX, 1),
        pos_y: roundToPrecision(newY, 1),
      });
    }

    this.snapGuides = guides;
  }

  private updateResize(event: PointerEvent): void {
    if (this.activeWidgetIds.length === 0) return;

    const widgetId = this.activeWidgetIds[0];
    const widgetsMap = get(widgets);
    const widget = widgetsMap[widgetId];
    const startPos = this.startPositions[widgetId];
    const startSize = this.startSizes[widgetId];
    if (!widget || !startPos || !startSize) return;

    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;

    let rawX = startPos.x;
    let rawY = startPos.y;
    let rawW = startSize.width;
    let rawH = startSize.height;

    switch (this.activeHandle) {
      case "nw":
        rawX += deltaX;
        rawY += deltaY;
        rawW -= deltaX;
        rawH -= deltaY;
        break;
      case "ne":
        rawY += deltaY;
        rawW += deltaX;
        rawH -= deltaY;
        break;
      case "sw":
        rawX += deltaX;
        rawW -= deltaX;
        rawH += deltaY;
        break;
      case "se":
        rawW += deltaX;
        rawH += deltaY;
        break;
    }

    if (rawW < MIN_SIZE) {
      if (this.activeHandle.includes("w")) {
        rawX += rawW - MIN_SIZE;
      }
      rawW = MIN_SIZE;
    }
    if (rawH < MIN_SIZE) {
      if (this.activeHandle.includes("n")) {
        rawY += rawH - MIN_SIZE;
      }
      rawH = MIN_SIZE;
    }

    rawX = Math.max(0, rawX);
    rawY = Math.max(0, rawY);

    const fixedRight = startPos.x + startSize.width;
    const fixedBottom = startPos.y + startSize.height;

    const targetsX = [
      ...buildGridTargetsX(),
      ...buildWidgetTargetsX(this.activeWidgetIds),
      ...buildEqualSpacingTargetsX(this.activeWidgetIds),
    ];
    const targetsY = [
      ...buildGridTargetsY(),
      ...buildWidgetTargetsY(this.activeWidgetIds),
      ...buildEqualSpacingTargetsY(this.activeWidgetIds),
    ];

    let newX = rawX;
    let newY = rawY;
    let newW = rawW;
    let newH = rawH;
    const guides: SnapGuide[] = [];

    if (this.activeHandle.includes("w")) {
      const match = this.findSnap(
        [{ position: rawX, offset: 0 }],
        targetsX,
        "vertical",
      );
      if (match) {
        newX = match.targetPosition;
        newW = fixedRight - newX;
        guides.push(match.guide);
      } else {
        newX = gridLayout.snapX(rawX);
        newW = fixedRight - newX;
      }
    } else if (this.activeHandle.includes("e")) {
      const rightEdge = rawX + rawW;
      const match = this.findSnap(
        [{ position: rightEdge, offset: 0 }],
        targetsX,
        "vertical",
      );
      if (match) {
        newW = match.targetPosition - rawX;
        guides.push(match.guide);
      } else {
        newW = gridLayout.snapWidth(rawW);
      }
    }

    if (this.activeHandle.includes("n")) {
      const match = this.findSnap(
        [{ position: rawY, offset: 0 }],
        targetsY,
        "horizontal",
      );
      if (match) {
        newY = match.targetPosition;
        newH = fixedBottom - newY;
        guides.push(match.guide);
      } else {
        newY = gridLayout.snapY(rawY);
        newH = fixedBottom - newY;
      }
    } else if (this.activeHandle.includes("s")) {
      const bottomEdge = rawY + rawH;
      const match = this.findSnap(
        [{ position: bottomEdge, offset: 0 }],
        targetsY,
        "horizontal",
      );
      if (match) {
        newH = match.targetPosition - rawY;
        guides.push(match.guide);
      } else {
        newH = gridLayout.snapHeight(rawH);
      }
    }

    widgetUtils.updateWidget(widgetId, {
      pos_x: roundToPrecision(newX, 1),
      pos_y: roundToPrecision(newY, 1),
      width: Math.round(newW),
      height: Math.round(newH),
    });

    this.snapGuides = guides;
  }

  private endDrag(): void {
    const widgetsMap = get(widgets);
    const commands: MoveWidgetCommand[] = [];

    for (const id of this.activeWidgetIds) {
      const widget = widgetsMap[id];
      const startPos = this.startPositions[id];
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
        new BatchCommand(
          commands,
          `Move ${commands.length} widget${commands.length === 1 ? "" : "s"}`,
        ),
      );
    }

    this.reset();
  }

  private endResize(): void {
    if (this.activeWidgetIds.length === 0) {
      this.reset();
      return;
    }

    const widgetId = this.activeWidgetIds[0];
    const widgetsMap = get(widgets);
    const widget = widgetsMap[widgetId];
    const startPos = this.startPositions[widgetId];
    const startSize = this.startSizes[widgetId];

    if (!widget || !startPos || !startSize) {
      this.reset();
      return;
    }

    const commands: (MoveWidgetCommand | ResizeWidgetCommand)[] = [];
    const newPos = { x: widget.pos_x, y: widget.pos_y };
    const newSize = { width: widget.width, height: widget.height };

    if (newPos.x !== startPos.x || newPos.y !== startPos.y) {
      commands.push(
        new MoveWidgetCommand(
          widgetId,
          startPos,
          newPos,
          widgetUtils.updateWidget,
        ),
      );
    }
    if (
      newSize.width !== startSize.width ||
      newSize.height !== startSize.height
    ) {
      commands.push(
        new ResizeWidgetCommand(
          widgetId,
          startSize,
          newSize,
          widgetUtils.updateWidget,
        ),
      );
    }

    if (commands.length > 0) {
      historyStore.executeCommand(new BatchCommand(commands, "Resize widget"));
    }

    this.reset();
  }

  private reset(): void {
    this.mode = "idle";
    this.activeWidgetIds = [];
    this.startPositions = {};
    this.startSizes = {};
    this.pointerStart = { x: 0, y: 0 };
    this.activeHandle = "";
    this.snapGuides = [];
    this.detachListeners();
  }

  startDrag(event: PointerEvent, widgetId: string): void {
    if (typeof window === "undefined") return;
    if (event.button !== 0) return;
    if (get(editMode) !== "edit") return;

    const widgetsMap = get(widgets);
    const targetWidget = widgetsMap[widgetId];
    if (!targetWidget || targetWidget.is_locked) return;

    const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
    uiUtils.selectWidget(widgetId, multiSelect);

    const updatedSelectedIds = getSelectedWidgetIds();
    const finalActiveIds = getSelectedAndGroupedWidgetIds(
      widgetId,
      updatedSelectedIds,
      widgetsMap,
      get(widgetGroups),
    );

    if (finalActiveIds.some((id) => widgetsMap[id]?.is_locked)) return;

    event.preventDefault();
    event.stopPropagation();

    this.recordStartState(finalActiveIds);
    this.mode = "dragging";
    this.activeWidgetIds = finalActiveIds;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.activeHandle = "";
    this.snapGuides = [];
    this.attachListeners();
  }

  startResize(event: PointerEvent, widgetId: string, handle: string): void {
    if (typeof window === "undefined") return;
    if (event.button !== 0) return;
    if (get(editMode) !== "edit") return;

    const widgetsMap = get(widgets);
    const widget = widgetsMap[widgetId];
    if (!widget || widget.is_locked) return;

    event.preventDefault();
    event.stopPropagation();

    uiUtils.selectWidget(widgetId, false);

    this.recordStartState([widgetId]);
    this.mode = "resizing";
    this.activeWidgetIds = [widgetId];
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.activeHandle = handle;
    this.snapGuides = [];
    this.attachListeners();
  }

  cancel(): void {
    this.detachListeners();
    this.reset();
  }

  nudgeSelected(direction: Direction, multiplier: number = 1): void {
    if (this.mode !== "idle") return;

    const selectedIds = getSelectedWidgetIds();
    if (selectedIds.length === 0) return;

    const widgetsMap = get(widgets);
    const commands: MoveWidgetCommand[] = [];
    const stepX = gridLayout.gridStepX * multiplier;
    const stepY = gridLayout.gridStepY * multiplier;

    for (const id of selectedIds) {
      const widget = widgetsMap[id];
      if (!widget || widget.is_locked) continue;

      const oldPos = { x: widget.pos_x, y: widget.pos_y };
      let newX = oldPos.x;
      let newY = oldPos.y;

      switch (direction) {
        case "left":
          newX -= stepX;
          break;
        case "right":
          newX += stepX;
          break;
        case "up":
          newY -= stepY;
          break;
        case "down":
          newY += stepY;
          break;
      }

      newX = Math.max(0, gridLayout.snapX(newX));
      newY = Math.max(0, gridLayout.snapY(newY));

      commands.push(
        new MoveWidgetCommand(id, oldPos, { x: newX, y: newY }, widgetUtils.updateWidget),
      );
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
}

export const gridInteraction = new GridInteractionState();
