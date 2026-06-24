export type CellSize = 64 | 96 | 128;
export const CELL_SIZES: CellSize[] = [64, 96, 128];

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

const STORAGE_KEY = "ultimon_grid_layout";

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
  cellSize = $state<CellSize>(64);
  gridGap = $state<GridGap>(8);
  cornerRadius = $state<CornerRadius>(8);

  gridStep = $derived(this.cellSize + this.gridGap);
  effectiveCornerRadius = $derived(
    Math.min(this.cornerRadius, this.cellSize / 2),
  );

  snapX = $derived((value: number) => snapToGridStep(value, this.gridStep));
  snapY = $derived((value: number) => snapToGridStep(value, this.gridStep));
  snapWidth = $derived((value: number) =>
    snapSizeToCells(value, this.cellSize, this.gridGap),
  );
  snapHeight = $derived((value: number) =>
    snapSizeToCells(value, this.cellSize, this.gridGap),
  );

  constructor() {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        cellSize?: unknown;
        gridGap?: unknown;
        cornerRadius?: unknown;
      };

      if (CELL_SIZES.includes(parsed.cellSize as CellSize)) {
        this.cellSize = parsed.cellSize as CellSize;
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

  setCellSize(value: CellSize): void {
    this.cellSize = value;
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

  reset(): void {
    this.cellSize = 64;
    this.gridGap = 8;
    this.cornerRadius = 8;
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cellSize: this.cellSize,
        gridGap: this.gridGap,
        cornerRadius: this.cornerRadius,
      }),
    );
  }
}

export const gridLayout = new GridLayoutState();
