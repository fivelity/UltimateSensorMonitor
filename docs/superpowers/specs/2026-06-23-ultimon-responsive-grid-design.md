# Ultimon Responsive Grid Layout — Design Spec

## Context

The Grid workspace mode currently uses a fixed pixel cell size (`64`, `96`, `128`). The user picks a cell size, and the grid is rendered as a set of fixed-size cells that may not fit the canvas container well. The request is to make the grid **responsive**: instead of choosing a pixel cell size, the user chooses a number of columns and rows, and the grid cells resize to fill the available canvas with equal padding on all sides. The gap between cells remains adjustable.

This spec builds on the recent grid fix that replaced gridline rendering with visible DOM cells.

## Goals

1. Replace the fixed `cellSize` setting with user-selectable `columns` and `rows` counts.
2. Render grid cells so they resize proportionally to the canvas container.
3. Distribute the grid evenly inside the container with equal padding on all four borders.
4. Preserve the existing `gridGap` and `cornerRadius` settings.
5. Keep widgets snapping to the responsive grid cells.
6. Update the Grid Settings UI to reflect the new controls.

## Scope

### In Scope

- `client/src/lib/stores/gridLayout.svelte.ts` — state model and snapping math.
- `client/src/lib/components/GridCanvas.svelte` — responsive grid rendering and container measurement.
- `client/src/lib/components/GridWidget.svelte` — consume new responsive snapping (no structural changes expected).
- `client/src/lib/components/GridSettings.svelte` — new columns/rows controls.
- `client/src/lib/components/SensorToWidgetWizard.svelte` and `LeftSidebar.svelte` — placement helpers automatically use the new snapping.
- Local storage migration for the renamed grid settings.

### Out of Scope

- Dashboard mode (freeform canvas) behavior.
- Changing the `WidgetConfig` data model to store grid units instead of pixels.
- Backend or preset API changes.
- Scroll behavior for widgets placed outside the responsive grid area.
- Adding a separate padding control (padding is derived from `gridGap`).

## Design Details

### 1. Grid Layout State

Replace the `CellSize` setting with two new settings:

```ts
export type GridCount = 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
export const COLUMN_OPTIONS: GridCount[] = [2, 4, 6, 8, 10, 12, 16, 20, 24];
export const ROW_OPTIONS: GridCount[]    = [2, 4, 6, 8, 10, 12, 16, 20, 24];
```

`GridLayoutState` exposes:

- `columns` — persisted user setting.
- `rows` — persisted user setting.
- `gridGap` — persisted user setting (unchanged).
- `cornerRadius` — persisted user setting (unchanged).
- `cellWidth` / `cellHeight` — runtime pixel dimensions set by the canvas component.
- `originX` / `originY` — runtime pixel offset of the first grid cell from the container edge.
- Derived values:
  - `gridStepX = cellWidth + gridGap`
  - `gridStepY = cellHeight + gridGap`
  - `effectiveCornerRadius = min(cornerRadius, cellWidth / 2, cellHeight / 2)`
  - `padding = gridGap` (derived, no separate UI)

Methods:

- `setColumns(value)` / `setRows(value)` — update persisted settings.
- `setCellDimensions(width, height, originX, originY)` — called by `GridCanvas` whenever the container size changes.
- `reset()` — resets to defaults (e.g., 12 columns, 8 rows, gap 8, radius 8).

Snapping functions:

- `snapX(value) = originX + round((value - originX) / gridStepX) * gridStepX`
- `snapY(value) = originY + round((value - originY) / gridStepY) * gridStepY`
- `snapWidth(value)` and `snapHeight(value)` reuse the existing `snapSizeToCells` helper with `cellWidth`/`cellHeight` respectively.

The storage key should be renamed (e.g., from `ultimon_grid_layout` to `ultimon_grid_layout_v2`) so old `cellSize` values are ignored and the new defaults are used.

### 2. Grid Canvas Rendering

`GridCanvas` becomes a responsive grid container:

- The grid container fills the canvas container (`absolute inset-0`).
- CSS Grid layout:
  - `grid-template-columns: repeat(columns, 1fr)`
  - `grid-template-rows: repeat(rows, 1fr)`
  - `gap: gridGap`
  - `padding: gridGap` (equal padding on all borders)
- Each grid cell is a visible rounded `div` using theme tokens (`--theme-surface`, `--theme-border`) and the effective corner radius.
- A `ResizeObserver` on the grid container measures its content box and computes:
  - `originX = originY = gridGap`
  - `cellWidth = (contentWidth - 2 * gridGap - (columns - 1) * gridGap) / columns`
  - `cellHeight = (contentHeight - 2 * gridGap - (rows - 1) * gridGap) / rows`
- The observer calls `gridLayout.setCellDimensions(...)` on mount and on every resize.
- The grid is generated from `columns * rows` cells, not from widget content bounds. The content wrapper no longer needs to expand based on widget positions; it stays at the container size.

### 3. Widget Snapping

`GridWidget` already consumes `gridLayout.snapX`, `snapY`, `snapWidth`, `snapHeight`, and `effectiveCornerRadius`. After the store changes, these functions will automatically use the responsive cell dimensions. No direct change to `GridWidget` is expected.

Because widgets are still stored in pixels, a widget placed at a snapped position will be aligned to the current grid. If the viewport is resized, the grid cells change size and the widget may no longer align. This is an acceptable trade-off for this phase (see Risks).

### 4. Grid Settings UI

`GridSettings` replaces the single `Cell Size` select with two selects:

- **Columns** — options from `COLUMN_OPTIONS`.
- **Rows** — options from `ROW_OPTIONS`.
- **Grid Gap** — unchanged.
- **Corner Radius** — unchanged.
- **Reset** — unchanged, resets to the new defaults.

### 5. Placement Helpers

`SensorToWidgetWizard` and `LeftSidebar` already use `gridLayout.snapX`/`snapY`/`snapWidth`/`snapHeight` in grid mode. After the store changes, placed widgets will snap to the responsive grid. No structural changes are expected, but the default placement should still center the widget within the visible canvas.

### 6. Widget Inspector (Future Enhancement)

In a follow-up, the Layout section of `WidgetInspector` could display grid units (column, row, column span, row span) when a grid-mode widget is selected. For this spec, the inspector continues to show pixel values.

## Data Model / Persistence

No changes to `WidgetConfig` or `DashboardPreset`.

`GridLayoutState` local storage changes:
- New key: `ultimon_grid_layout_v2`.
- Saved fields: `columns`, `rows`, `gridGap`, `cornerRadius`.
- Old `ultimon_grid_layout` key is ignored; users will get the new defaults on first load.

## UI / UX Behavior

- Switching to Grid mode shows a grid that fills the canvas with equal padding on all sides.
- Changing the Columns/Rows setting redivides the canvas immediately.
- Changing the Grid Gap updates both the inter-cell spacing and the outer padding.
- Changing the Corner Radius updates both grid cells and widget borders.
- A widget dragged in grid mode snaps to the nearest cell boundary.

## Risks / Trade-offs

- **Pixel-based widgets are not fully responsive.** Because `WidgetConfig` stores `pos_x`, `pos_y`, `width`, `height` in pixels, resizing the viewport changes the grid cell size but does not reflow existing widgets. They will snap to the new grid only when they are next moved or resized. A future phase can store grid units for true responsive layouts.
- **Fractional cell sizes.** The computed `cellWidth`/`cellHeight` may be fractional. CSS Grid handles this naturally; snapping uses the computed float values.
- **Scrollbars.** If the canvas container has scrollbars, the `ResizeObserver` content box excludes them, so the grid fits the visible area.
- **Switching from old cellSize presets.** Users who had a saved `cellSize` will see the new defaults until they adjust columns/rows. This is acceptable because the old value is no longer meaningful.

## Verification

- `npm run check` passes with no TypeScript/Svelte errors.
- `npm run build` succeeds.
- Visual check:
  - Toggle to Grid mode: the grid fills the canvas with equal padding.
  - Change Columns/Rows: the grid redivides evenly.
  - Change Grid Gap: spacing and padding update together.
  - Add/move/resize a widget: it snaps to the responsive cells and its corner radius matches the cells.
