import { get } from "svelte/store";
import { widgets, selectedWidgets } from "$lib/stores";
import { widgetUtils } from "$lib/stores/data/widgets";
import { historyStore, MoveWidgetCommand, ResizeWidgetCommand, BatchCommand } from "$lib/stores/history";
import type { WidgetConfig } from "$lib/types";

export type AlignAction =
  | "align-left"
  | "align-right"
  | "align-top"
  | "align-bottom"
  | "align-center-horizontal"
  | "align-center-vertical";

export type DistributeAction = "distribute-horizontal" | "distribute-vertical";

export type ArrangementAction = AlignAction | DistributeAction;

function getSelectedWidgets(): WidgetConfig[] {
  const selection = get(selectedWidgets);
  if (selection.type !== "widget" || selection.ids.length === 0) return [];

  const widgetsMap = get(widgets);
  return selection.ids
    .map((id) => widgetsMap[id])
    .filter((w): w is WidgetConfig => Boolean(w) && !w.is_locked);
}

function executeCommands(commands: (MoveWidgetCommand | ResizeWidgetCommand)[], description: string): void {
  if (commands.length === 0) return;
  historyStore.executeCommand(new BatchCommand(commands, description));
}

export function alignWidgets(action: AlignAction): void {
  const selected = getSelectedWidgets();
  if (selected.length < 2) return;

  const commands: MoveWidgetCommand[] = [];

  let targetValue: number;

  switch (action) {
    case "align-left":
      targetValue = Math.min(...selected.map((w) => w.pos_x));
      break;
    case "align-right":
      targetValue = Math.max(...selected.map((w) => w.pos_x + w.width));
      break;
    case "align-top":
      targetValue = Math.min(...selected.map((w) => w.pos_y));
      break;
    case "align-bottom":
      targetValue = Math.max(...selected.map((w) => w.pos_y + w.height));
      break;
    case "align-center-horizontal": {
      const minX = Math.min(...selected.map((w) => w.pos_x));
      const maxX = Math.max(...selected.map((w) => w.pos_x + w.width));
      targetValue = minX + (maxX - minX) / 2;
      break;
    }
    case "align-center-vertical": {
      const minY = Math.min(...selected.map((w) => w.pos_y));
      const maxY = Math.max(...selected.map((w) => w.pos_y + w.height));
      targetValue = minY + (maxY - minY) / 2;
      break;
    }
  }

  for (const widget of selected) {
    const oldPos = { x: widget.pos_x, y: widget.pos_y };
    const newPos = { ...oldPos };

    switch (action) {
      case "align-left":
        newPos.x = targetValue;
        break;
      case "align-right":
        newPos.x = targetValue - widget.width;
        break;
      case "align-top":
        newPos.y = targetValue;
        break;
      case "align-bottom":
        newPos.y = targetValue - widget.height;
        break;
      case "align-center-horizontal":
        newPos.x = targetValue - widget.width / 2;
        break;
      case "align-center-vertical":
        newPos.y = targetValue - widget.height / 2;
        break;
    }

    newPos.x = Math.round(newPos.x);
    newPos.y = Math.round(newPos.y);

    if (newPos.x !== oldPos.x || newPos.y !== oldPos.y) {
      commands.push(new MoveWidgetCommand(widget.id, oldPos, newPos, widgetUtils.updateWidget));
    }
  }

  executeCommands(commands, "Align widgets");
}

export function distributeWidgets(action: DistributeAction): void {
  const selected = getSelectedWidgets();
  if (selected.length < 3) return;

  const commands: MoveWidgetCommand[] = [];

  if (action === "distribute-horizontal") {
    const sorted = [...selected].sort((a, b) => a.pos_x - b.pos_x);
    const minX = sorted[0].pos_x;
    const maxX = sorted[sorted.length - 1].pos_x;
    const totalWidth = maxX - minX;
    const gap = totalWidth / (sorted.length - 1);

    for (let i = 0; i < sorted.length; i++) {
      const widget = sorted[i];
      const oldPos = { x: widget.pos_x, y: widget.pos_y };
      const newPos = { ...oldPos, x: Math.round(minX + gap * i) };
      if (newPos.x !== oldPos.x) {
        commands.push(new MoveWidgetCommand(widget.id, oldPos, newPos, widgetUtils.updateWidget));
      }
    }
  } else {
    const sorted = [...selected].sort((a, b) => a.pos_y - b.pos_y);
    const minY = sorted[0].pos_y;
    const maxY = sorted[sorted.length - 1].pos_y;
    const totalHeight = maxY - minY;
    const gap = totalHeight / (sorted.length - 1);

    for (let i = 0; i < sorted.length; i++) {
      const widget = sorted[i];
      const oldPos = { x: widget.pos_x, y: widget.pos_y };
      const newPos = { ...oldPos, y: Math.round(minY + gap * i) };
      if (newPos.y !== oldPos.y) {
        commands.push(new MoveWidgetCommand(widget.id, oldPos, newPos, widgetUtils.updateWidget));
      }
    }
  }

  executeCommands(commands, "Distribute widgets");
}
