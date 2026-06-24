export type GridCount = 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
export const COLUMN_OPTIONS: GridCount[] = [2, 4, 6, 8, 10, 12, 16, 20, 24];
export const ROW_OPTIONS: GridCount[] = [2, 4, 6, 8, 10, 12, 16, 20, 24];

export type GridGap = 4 | 8 | 12 | 16 | 20 | 24;
export const GRID_GAPS: GridGap[] = [4, 8, 12, 16, 20, 24];

export type CornerRadius =
  | 1
  | 2
  | 3
  | 4
  | 6
  | 8
  | 10
  | 12
  | 14
  | 16
  | 18
  | 20
  | 22
  | 24
  | 32
  | 40
  | 48
  | 56
  | 64;
export const CORNER_RADIUSES: CornerRadius[] = [
  1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 32, 40, 48, 56, 64,
];

const STORAGE_KEY = "ultimon_grid_layout_v2";

export function snapToGridStep(value: number, gridStep: number): number {
  if (gridStep <= 0) return value;
  return Math.round(value / gridStep) * gridStep;
}

export function snapSizeToCells(
  value: number,
  cellSize: number,
  gridGap: number,
): number {
  const gridStep = cellSize + gridGap;
  if (gridStep <= 0) return Math.max(cellSize, value);
  const n = Math.max(1, Math.round((value + gridGap) / gridStep));
  return n * cellSize + (n - 1) * gridGap;
}

class GridLayoutState {
  columns = $state<GridCount>(12);
  rows = $state<GridCount>(8);
  gridGap = $state<GridGap>(8);
  cornerRadius = $state<CornerRadius>(8);

  cellWidth = $state<number>(0);
  cellHeight = $state<number>(0);
  originX = $state<number>(0);
  originY = $state<number>(0);

  gridStepX = $derived(this.cellWidth + this.gridGap);
  gridStepY = $derived(this.cellHeight + this.gridGap);

  effectiveCornerRadius = $derived(
    Math.min(this.cornerRadius, this.cellWidth / 2, this.cellHeight / 2),
  );

  padding = $derived(this.gridGap);

  snapX = $derived(
    (value: number) =>
      this.originX + snapToGridStep(value - this.originX, this.gridStepX),
  );
  snapY = $derived(
    (value: number) =>
      this.originY + snapToGridStep(value - this.originY, this.gridStepY),
  );
  snapWidth = $derived(
    (value: number) => snapSizeToCells(value, this.cellWidth, this.gridGap),
  );
  snapHeight = $derived(
    (value: number) => snapSizeToCells(value, this.cellHeight, this.gridGap),
  );

  constructor() {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        columns?: unknown;
        rows?: unknown;
        gridGap?: unknown;
        cornerRadius?: unknown;
      };

      if (COLUMN_OPTIONS.includes(parsed.columns as GridCount)) {
        this.columns = parsed.columns as GridCount;
      }
      if (ROW_OPTIONS.includes(parsed.rows as GridCount)) {
        this.rows = parsed.rows as GridCount;
      }
      if (GRID_GAPS.includes(parsed.gridGap as GridGap)) {
        this.gridGap = parsed.gridGap as GridGap;
      }
      if (CORNER_RADIUSES.includes(parsed.cornerRadius as CornerRadius)) {
        this.cornerRadius = parsed.cornerRadius as CornerRadius;
      }
    } catch {
      // Ignore corrupted storage.
    }
  }

  setColumns(value: GridCount): void {
    this.columns = value;
    this.save();
  }

  setRows(value: GridCount): void {
    this.rows = value;
    this.save();
  }

  setGridGap(value: GridGap): void {
    this.gridGap = value;
    this.save();
  }

  setCornerRadius(value: CornerRadius): void {
    this.cornerRadius = value;
    this.save();
  }

  setCellDimensions(
    width: number,
    height: number,
    originX: number,
    originY: number,
  ): void {
    this.cellWidth = width;
    this.cellHeight = height;
    this.originX = originX;
    this.originY = originY;
  }

  reset(): void {
    this.columns = 12;
    this.rows = 8;
    this.gridGap = 8;
    this.cornerRadius = 8;
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        columns: this.columns,
        rows: this.rows,
        gridGap: this.gridGap,
        cornerRadius: this.cornerRadius,
      }),
    );
  }
}

export const gridLayout = new GridLayoutState();
