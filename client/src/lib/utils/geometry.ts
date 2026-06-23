import type { Bounds, Point, Size, WidgetConfig } from "$lib/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    b.x > a.x + a.width ||
    b.x + b.width < a.x ||
    b.y > a.y + a.height ||
    b.y + b.height < a.y
  );
}

export function getBounds(widget: Pick<WidgetConfig, "pos_x" | "pos_y" | "width" | "height">): Bounds {
  return {
    x: widget.pos_x,
    y: widget.pos_y,
    width: widget.width,
    height: widget.height,
  };
}

export function getCenter(widget: Pick<WidgetConfig, "pos_x" | "pos_y" | "width" | "height">): Point {
  return {
    x: widget.pos_x + widget.width / 2,
    y: widget.pos_y + widget.height / 2,
  };
}

export function getBoundsForWidgets(widgets: Pick<WidgetConfig, "pos_x" | "pos_y" | "width" | "height">[]): Bounds | null {
  if (widgets.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const widget of widgets) {
    minX = Math.min(minX, widget.pos_x);
    minY = Math.min(minY, widget.pos_y);
    maxX = Math.max(maxX, widget.pos_x + widget.width);
    maxY = Math.max(maxY, widget.pos_y + widget.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function isNear(value: number, target: number, threshold: number): boolean {
  return Math.abs(value - target) <= threshold;
}

export function roundToPrecision(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export function constrainSize(
  size: Size,
  minSize: Size,
  maxSize: Size,
): Size {
  return {
    width: clamp(size.width, minSize.width, maxSize.width),
    height: clamp(size.height, minSize.height, maxSize.height),
  };
}

export function constrainPosition(
  position: Point,
  bounds: Size,
  containerSize: Size,
): Point {
  return {
    x: clamp(position.x, 0, Math.max(0, containerSize.width - bounds.width)),
    y: clamp(position.y, 0, Math.max(0, containerSize.height - bounds.height)),
  };
}
