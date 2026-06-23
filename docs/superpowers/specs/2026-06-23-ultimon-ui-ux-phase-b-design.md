# Ultimon UI/UX Improvement — Phase B Design

## Context

Phase A completed the theme-token cleanup and visual polish across the SvelteKit client. All components now consume `--theme-*` CSS custom properties, the theme preset switcher is visible in the TopBar and VisualDimensionsPanel, and the Professional, Gamer HUD, and Glassmorphism themes render consistently. `npm run lint`, `npm run check`, and `npm run build` all pass with zero errors.

Phase B moves from "looks right" to "feels right": the dashboard canvas already supports single-widget drag, single-widget resize, rubber-band multi-selection, and visual snap guides, but the interactions are not yet cohesive. Snap-to-grid is visual-only, multi-selected widgets cannot be moved together, keyboard nudging is absent, and the undo/redo system is implemented as a store but not wired into widget operations. This design consolidates those gaps into a single interaction layer.

## Goals

1. Make drag, resize, and snap feel precise and predictable on the canvas.
2. Treat multi-selection as a first-class citizen: move, resize, align, distribute, and delete as a unit.
3. Wire up the existing command-pattern history store so every layout change is undoable/redoable.
4. Add keyboard-driven layout editing (nudge, select all, clear selection, delete, undo/redo).
5. Add an empty state and a direct sensor-to-canvas drop path so the canvas is never a dead zone.
6. Keep the visual layer from Phase A untouched; no new color or theme work.

## Scope

### In Scope

- Create a centralized dashboard interaction layer (`client/src/lib/stores/interactions/` or `dashboardInteractions.ts`) that owns drag, resize, snap, and selection math.
- Update `DashboardCanvas.svelte` to coordinate multi-drag, snap application, keyboard shortcuts, and empty-state rendering.
- Update `WidgetContainer.svelte` to delegate pointer events to the interaction layer and to render multi-selection states.
- Update `ResizeHandles.svelte` to support snap-to-grid during resize and to constrain aspect ratio when `Shift` is held.
- Update `SnapGuides.svelte` to drive both visual guides and actual snapping logic; consume it from the interaction layer instead of duplicating math.
- Wire `historyStore` and existing commands (`MoveWidgetCommand`, `ResizeWidgetCommand`, `AddWidgetCommand`, `RemoveWidgetCommand`, `BatchCommand`) into `widgetUtils` and `uiUtils` operations.
- Add alignment/distribution actions to the `ContextMenu.svelte` and/or a small toolbar in the canvas area.
- Add keyboard shortcuts in `+page.svelte` or `DashboardCanvas.svelte` for:
  - Arrow keys (nudge)
  - `Ctrl/Cmd + A` (select all widgets)
  - `Escape` (clear selection)
  - `Delete` / `Backspace` (remove selected widgets)
  - `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` (undo/redo)
- Add drag-and-drop sensor creation from `LeftSidebar.svelte` onto the canvas.
- Add an empty-state placeholder in `DashboardCanvas.svelte` when `$widgetCount === 0`.
- Add a small floating canvas toolbar for toggling grid, snap, and quick-align actions while in edit mode.

### Out of Scope

- No new gauge types or widget rendering changes (visual content stays the same).
- No new theme presets or color tokens (Phase A owns theming).
- No server-side changes or backend preset persistence.
- No major sidebar/inspector redesign (Phase C).
- No new charting library (e.g., `layerchart@next`) or component library (e.g., `shadcn-svelte`).
- No canvas zoom/pan (future phase).
- No mobile touch interactions beyond the current mouse-driven behavior.

## Design Details

### Centralized Interaction Layer

A new module `client/src/lib/stores/interactions/dashboard.ts` will expose a single `dashboardInteraction` utility object and a small set of reactive stores:

```ts
export interface InteractionState {
  mode: "idle" | "dragging" | "resizing" | "selecting";
  activeWidgetIds: string[];
  startPositions: Record<string, Point>;
  pointerStart: Point;
  pointerCurrent: Point;
  snapGuides: SnapGuide[];
}
```

Responsibilities:

- Start/maintain/end drag and resize sessions from pointer events.
- Compute per-widget deltas and apply snap and grid quantization.
- Emit batched updates via `widgetUtils.updateWidget` during the interaction and a single `BatchCommand` at the end so undo/redo captures the full move/resize as one step.
- Keep `SnapGuides.svelte` pure: it receives a list of guides and renders them; the interaction layer calculates the guides using the same snap points.
- Respect `widget.is_locked` and `widget.group_id`:
  - Locked widgets are never moved, resized, or included in group moves unless explicitly unlocked first.
  - Grouped widgets move together when any member of the group is dragged and the group is selected as a whole.

### Multi-Selection Drag

When a widget is dragged and `selectedWidgets` contains multiple widget IDs, all selected widgets move by the same delta. The interaction layer calculates the delta from the pointer and applies it to each widget's original `startPositions`.

Rules:

- If the dragged widget is not selected, it becomes the sole selection on drag start (existing behavior).
- If a selected widget is locked, the whole selection is blocked from moving and a brief visual shake or toast indicates the lock.
- Grouped widgets move together if the selection is exactly the group (or any subset that does not break group integrity). If a group is partially selected, only the selected widgets move.

### Snap-To-Grid and Snap-To-Widget

The current `SnapGuides.svelte` draws dashed lines at nearby widget edges. In Phase B it will also affect placement:

- **Grid snapping**: When `snap_to_grid` is enabled and the widget is within half a grid cell of a grid line, the position snaps to the grid line. This is prioritized over widget snapping to avoid fighting.
- **Widget snapping**: When near another widget's edge or center (within `snapDistance` of 10px), the active widget snaps to that edge/center. The snap guides highlight the snapped target with a stronger color.
- **Resize snapping**: Resizing from the north/west handles also snaps the moved edge to grid or widget edges, and updates `pos_x`/`pos_y` as well as `width`/`height`.
- **Threshold feedback**: The snap distance threshold is 10px; when a snap is active, the guide opacity increases and the cursor position is subtly drawn to the snap target (CSS only, no cursor warping).

### Keyboard Shortcuts

Keyboard handling will be added at the dashboard level via a `keydown` listener on `document` or the canvas, guarded by `editMode === "edit"` and by excluding active inputs/textareas.

| Key | Action | History command |
|-----|--------|-----------------|
| Arrow keys | Nudge selected widget(s) 1px in direction. | `BatchCommand` of `MoveWidgetCommand` |
| `Shift + Arrow` | Nudge by `grid_size` pixels. | `BatchCommand` of `MoveWidgetCommand` |
| `Ctrl/Cmd + A` | Select all unlocked widgets. | None |
| `Escape` | Clear selection and hide context menu. | None |
| `Delete` / `Backspace` | Remove selected widgets. | `BatchCommand` of `RemoveWidgetCommand` |
| `Ctrl/Cmd + D` | Duplicate selected widgets with 20px offset. | `BatchCommand` of `AddWidgetCommand` |
| `Ctrl/Cmd + Z` | Undo. | `historyStore.undo()` |
| `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` | Redo. | `historyStore.redo()` |
| `Ctrl/Cmd + Arrow` | Nudge 10px for faster coarse movement. | `BatchCommand` of `MoveWidgetCommand` |

Accessibility: the canvas will have `tabindex="0"` and a visible focus ring; the keyboard handler is active when the canvas is focused or when no input is focused.

### Alignment and Distribution

A small floating canvas toolbar appears in edit mode with alignment and distribution actions. Alternatively, the same actions can be exposed in the context menu for selected widgets. Actions:

- Align left/right/center/horizontally-center/top/bottom/vertically-center.
- Distribute horizontally/vertically with equal spacing.
- Match width/height to the primary selected widget (last selected or first in selection).
- Bring to front / Send to back (already in context menu; keep there).

Implementation: each action computes target positions/sizes for selected widgets and executes a `BatchCommand` of `MoveWidgetCommand` / `ResizeWidgetCommand` so undo works.

### Undo/Redo Integration

The `historyStore` already has command classes. Phase B will:

- Replace direct `widgetUtils.updateWidget` calls for user-initiated moves/resizes with `historyStore.executeCommand(new MoveWidgetCommand(...))` / `historyStore.executeCommand(new ResizeWidgetCommand(...))`.
- Batch multiple widget updates into a `BatchCommand` so undo/redo operate on the logical user action, not per-widget micro-updates.
- Clear history on preset import or "clear all widgets" to avoid undoing across state resets.
- Expose undo/redo availability to the TopBar so buttons enable/disable correctly.
- Update TopBar undo/redo buttons to use the history store and add keyboard hints in titles.

### Drag-and-Drop From Sensor List

`LeftSidebar.svelte` will make sensor items draggable with a `dataTransfer` payload containing `sensorId` and a preferred `gaugeType`. `DashboardCanvas.svelte` will accept the drop at the pointer position relative to the canvas and create a new widget using `widgetUtils.addWidget` wrapped in an `AddWidgetCommand`.

Default dropped widget size: 200x120px, positioned at the drop coordinates (snapped to grid if enabled). The gauge type defaults to the sensor category's preferred gauge or `"text"`.

### Empty State

When `widgetCount === 0` and the app has initialized, the canvas shows a centered empty-state card:

- In edit mode: "Drag sensors here from the sidebar or import a preset." with a button to open the left sidebar.
- In view mode: "No widgets to display. Switch to Edit mode to add sensors." with a button to toggle edit mode.
- Uses existing theme tokens (`--theme-surface`, `--theme-border`, `--theme-text-muted`, `--theme-primary`).

### Floating Canvas Toolbar

A small, non-intrusive toolbar fixed inside the canvas (bottom-right or top-left) when in edit mode:

- Toggle grid visibility.
- Toggle snap-to-grid.
- Grid size stepper (1, 5, 10, 20, 50).
- Align/distribute dropdown when widgets are selected.
- Undo/redo buttons mirrored from the TopBar.

The toolbar uses the same theme tokens and icon set as the rest of the UI.

### Performance and UX Considerations

- During drag/resize, widget updates continue to be throttled (existing `updateThrottle` in `WidgetContainer`). The interaction layer will throttle batched updates to 16ms by default.
- The `SnapGuides` calculation runs on every drag move but only when `snap_to_grid` is enabled; keep it within the throttle budget.
- Selection rectangles and snap guides must not block pointer events (`pointer-events: none`).
- Use `requestAnimationFrame` or the existing throttle for DOM writes; avoid synchronous store updates per mouse event.
- Maintain `will-change` and `contain` CSS hints from Phase A.

## Component Updates

### `DashboardCanvas.svelte`

- Add empty-state rendering.
- Add `dragover` and `drop` handlers for sensor drops.
- Add keyboard listener (or delegate to the interaction layer).
- Render the floating canvas toolbar.
- Use the interaction layer for selection-rectangle logic or keep existing selection logic but feed results into it.
- Integrate `SnapGuides` with the interaction layer's `snapGuides` output.

### `WidgetContainer.svelte`

- Delegate mouse-down to `dashboardInteraction.startDrag(...)`.
- Receive and render multi-selection highlights and locked states.
- Remove local drag state; rely on the interaction layer for `isDragging` and `isResizing`.
- Keep the public event callbacks for backward compatibility but make them thin wrappers.

### `ResizeHandles.svelte`

- Delegate mouse-down to `dashboardInteraction.startResize(...)`.
- Support `Shift` key for aspect-ratio lock during resize.
- Support `Alt` key for resize from center (optional, nice-to-have).
- Remove duplicated resize math; use the interaction layer's computed size.

### `SnapGuides.svelte`

- Change from calculating guides internally to receiving `guides` via props.
- Remove `calculateSnap` function; snapping logic moves to the interaction layer.
- Keep visual rendering of dashed lines and color-by-widget-count logic.

### `ContextMenu.svelte`

- Add alignment/distribution submenu when multiple widgets are selected.
- Add undo/redo items when relevant.
- Add "Select All" and "Clear Selection" canvas-level actions.
- Keep existing lock/unlock, duplicate, delete, group, ungroup, z-index actions.

### `TopBar.svelte`

- Wire undo/redo buttons to `historyStore.undo()` / `historyStore.redo()` and disable when unavailable.
- Keep Phase A theme switcher and preset import/export.

### `LeftSidebar.svelte`

- Make sensor items draggable with `draggable="true"`.
- Allow quick-add buttons to be dragged too, or make the whole sensor row draggable with the default gauge type.

### `+page.svelte`

- Remove or replace any legacy keyboard handling with the dashboard-level interaction layer.
- Ensure the canvas can receive focus for keyboard shortcuts.

### New Stores / Utilities

- `client/src/lib/stores/interactions/dashboard.ts` — main interaction state machine and math.
- `client/src/lib/stores/interactions/snap.ts` — snap-point calculation helpers.
- `client/src/lib/stores/interactions/keyboard.ts` — keyboard shortcut dispatcher.
- `client/src/lib/utils/geometry.ts` — small geometry helpers (bounds, snap, clamp, align, distribute) if not already present.

## Success Criteria

1. `npm run lint`, `npm run check`, and `npm run build` pass in the `client` directory.
2. Dragging a selected widget moves all selected widgets together; locked widgets in the selection prevent the move.
3. With `snap_to_grid` enabled, widgets snap to the grid and to nearby widget edges/centers; snap guides visually confirm the snap target.
4. Resizing with `Shift` held preserves the original aspect ratio; resizing from north/west handles updates position correctly.
5. Keyboard shortcuts work: arrow nudging, select-all, escape, delete, duplicate, undo, redo.
6. Dropping a sensor from the left sidebar creates a widget at the drop location.
7. The canvas empty state is shown when no widgets exist and hidden when widgets are present.
8. Undo/redo correctly reverses and reapplies moves, resizes, adds, deletes, and alignment operations.
9. No new hardcoded colors appear; all new UI uses theme tokens from Phase A.
10. No `any` types are introduced in new TypeScript code.

## Phased Plan

- **Phase A** (completed): Theme-token cleanup and theme system polish.
- **Phase B** (this design): Dashboard interaction layer — multi-select, snap, keyboard, undo/redo, empty state, sensor drop.
- **Phase C** (future): Sidebar & inspector redesign — sensor search, better property grouping, improved group management, and a sensor-to-widget wizard.
- **Future consideration**: Canvas zoom/pan, touch interactions, and a dedicated arrangement panel.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Centralizing drag logic causes regressions in existing single-widget drag/resize | Keep `WidgetContainer` and `ResizeHandles` callbacks in place initially, then migrate one interaction at a time; verify with demo data after each change. |
| Snap logic fights between grid and widget targets | Prioritize grid snap when both are within threshold; use a single snap function in the interaction layer. |
| Undo/redo store is not currently wired, so commands may be executed multiple times or out of order | Only wrap final user actions in commands, not intermediate throttle frames; clear history on state resets. |
| Keyboard shortcuts conflict with browser/OS defaults | Use `preventDefault()` only on recognized shortcuts; respect inputs and textareas. |
| Drag-and-drop from sidebar requires HTML5 DnD + canvas coordinate math | Implement a small drop helper that converts client coordinates to canvas coordinates and snaps to grid. |
| Accessibility of keyboard-only interactions | Ensure canvas is focusable, focus states are visible, and all toolbar buttons have `aria-label` and `title`. |

## Notes

- Phase B intentionally builds on top of the Phase A theme tokens. Any new UI elements (toolbar, empty state, alignment menu) must follow the same token rules: no hardcoded Tailwind colors, no inline SVGs, consistent focus rings and transitions.
- The `visualSettings` store already contains `grid_size`, `snap_to_grid`, and `show_grid`. Phase B should not introduce new persisted settings unless absolutely necessary; prefer deriving behavior from existing ones.
- Group behavior in Phase B is limited to move-together. Advanced group features (group-level resize, group rotation, persistent group alignment) are deferred to Phase C.
- The command history should be considered a session-level feature; persistence of undo history across reloads is not required.
