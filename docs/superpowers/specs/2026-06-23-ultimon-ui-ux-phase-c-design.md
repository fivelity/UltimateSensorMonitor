# Ultimon UI/UX Improvement — Phase C Design

## Context

Phases A and B complete the visual and interaction layers of the dashboard. Phase C turns attention to the application's discoverability and editing surfaces: the left sidebar (sensor inventory), the right sidebar (inspector, visual settings, and group manager), and the workflows that connect sensors to widgets. The current sidebars are functional but minimal: there is no sensor search, no bulk property editing, no gauge-specific settings panel, and the group manager is a flat list. This design addresses those gaps without changing the core canvas interactions built in Phase B.

## Goals

1. Make it fast to find and add sensors to the dashboard.
2. Transform the widget inspector into a powerful, context-aware property editor.
3. Support bulk editing when multiple widgets are selected.
4. Improve the group manager so groups are easy to create, edit, locate, and maintain.
5. Add a lightweight sensor-to-widget wizard that guides new users without blocking expert users.
6. Keep Phase A's theme-token system and Phase B's interaction layer untouched.

## Scope

### In Scope

- Refactor `LeftSidebar.svelte` into a searchable, filterable sensor inventory with categories and recent/favorite shortcuts.
- Add a reusable `SearchInput` component in `client/src/lib/components/` and use it in the left sidebar and the inspector's sensor picker.
- Redesign `WidgetInspector.svelte` with:
  - Collapsible property sections (Basic, Display, Layout, Gauge-specific, Style overrides).
  - Multi-selection "bulk edit" mode that shows only shared properties and applies changes to all selected widgets.
  - A searchable sensor picker instead of a plain `<select>`.
  - Per-gauge-type settings panels that render the relevant `GaugeSettings` fields.
  - A style overrides editor driven by the `style_settings` bag and the active theme tokens.
- Improve `RightSidebar.svelte` with persistent tab selection, tab badges (e.g., selection count on Inspector, group count on Groups), and a resizable panel (optional, nice-to-have).
- Improve `WidgetGroupManager.svelte` with:
  - Inline rename and description edit.
  - Locate-group action that zooms/scrolls the canvas to the group's bounds (pan/zoom is out of scope, so this means flashing a highlight or scrolling into view).
  - Group highlight on the canvas when a group is selected in the manager.
  - Color or icon tagging for groups.
- Add a `SensorToWidgetWizard.svelte` that can be triggered from the left sidebar or a canvas empty-state button; it walks the user through sensor → gauge → placement.
- Add `client/src/lib/stores/inspector.ts` or extend `client/src/lib/stores/core/ui.ts` to track inspector UI state (expanded sections, search terms, recent sensors, favorites).
- Persist recent sensors and favorite sensors to `localStorage`.

### Out of Scope

- No new gauge types or gauge rendering changes.
- No new theme presets or color tokens (Phase A owns theming).
- No canvas zoom/pan or touch interactions (future phase).
- No server-side changes; sensor data remains read-only from the existing API/WebSocket.
- No backend preset storage or cloud sync.
- No major layout algorithm changes (auto-layout, packing, etc.).

## Design Details

### Left Sidebar: Sensor Inventory

The left sidebar is currently a category accordion with quick-add buttons. Phase C turns it into a sensor inventory with the following structure:

```
┌─────────────────────────────┐
│  🔍 Search sensors...       │
├─────────────────────────────┤
│  Favorites  ▼              │
│  Recent      ▼              │
│  Category 1  ▼              │
│    Sensor A    [+] [drag]   │
│    Sensor B    [+] [drag]   │
│  Category 2  ▼              │
│    ...                      │
└─────────────────────────────┘
```

#### Search and Filter

- A sticky search input at the top filters sensors by name, category, source name, and unit.
- The search uses `fuse.js` if available, otherwise a simple case-insensitive substring match. If `fuse.js` is not a dependency, do not add it; use a simple local filter.
- A small clear-button (X) appears when the search is non-empty.
- Categories with no matching sensors collapse automatically when filtering.

#### Favorites and Recent

- Two special sections at the top: **Favorites** and **Recently Used**.
- Favorite sensors can be toggled via a star icon next to each sensor row.
- Recent sensors are updated whenever a widget is created from a sensor (quick-add, drag-and-drop, or wizard).
- Both lists are persisted to `localStorage` under `ultimon_sensor_inventory`.
- Limit recent to 10 items; limit favorites to a user-defined cap (default 20).

#### Sensor Row Actions

Each sensor row shows:

- Sensor name and current value.
- Category icon and unit.
- A **star** to toggle favorite.
- A **quick-add** button that opens a small gauge-type popover (or directly adds the default gauge type).
- A **drag handle** to drag the sensor onto the canvas (Phase B drop zone).

#### Gauge-Type Popover

Clicking the quick-add button opens a small popover next to the row with the six gauge-type options and a default size preview. Selecting a gauge type creates the widget centered in the current canvas viewport (or at a default position if no canvas is visible). The popover is a new component: `SensorAddPopover.svelte`.

### Widget Inspector Redesign

The current inspector is a flat form for a single widget. Phase C redesigns it into a structured, multi-context editor.

#### Inspector State

New inspector UI state in a store:

```ts
export interface InspectorState {
  expandedSections: Record<string, boolean>;
  sensorSearchQuery: string;
  recentSensors: string[];
  favoriteSensors: string[];
}
```

Default expanded sections: Basic, Display, Layout. Collapsed: Gauge-specific, Style overrides.

#### Single-Widget Mode

When exactly one widget is selected, the inspector shows all sections:

1. **Basic Properties**
   - Searchable sensor picker (replaces `<select>`).
   - Gauge type selector with icon chips and descriptions.
   - Widget ID read-only with a copy button.

2. **Display Options**
   - Show label + custom label input.
   - Show unit + custom unit input.

3. **Layout**
   - X, Y, Width, Height numeric inputs with constraints.
   - Rotation input (0–360 or -180–180).
   - Z-index stepper and "Bring to Front" / "Send to Back" buttons.
   - Lock toggle.

4. **Gauge-Specific Settings**
   - A dynamic panel based on `gauge_type`.
   - Common fields: `color_primary`, `color_secondary`, `stroke_width`, `min_value`, `max_value`.
   - Radial: `start_angle`, `end_angle`, `inner_radius`.
   - Linear: `orientation`, `show_scale`.
   - Graph: `line_color`, `fill_area`, `show_points`, `time_range`.
   - Image sequence: `image_sequence` (comma-separated URLs), `animation_speed`.
   - Glassmorphic: `glow_intensity`, `blur_level`, `transparency`, `style`.

5. **Style Overrides**
   - A small key/value editor for the `style_settings` bag.
   - Preset quick-picks tied to the current theme (e.g., "Use primary color", "Use accent color").

#### Multi-Widget Mode

When multiple widgets are selected, the inspector enters bulk-edit mode:

- Show a summary header: "3 widgets selected".
- Show only properties that are common to the selected widgets and have the same value (or show "Mixed" when values differ).
- Edits apply to all selected widgets via `widgetUtils.updateWidget` wrapped in a `BatchCommand` for undo/redo.
- Provide quick bulk actions: lock all, unlock all, set gauge type, set sensor, align/distribute, delete all.
- When a property is mixed, the input shows a placeholder like "Mixed values"; changing it applies to all.

#### Searchable Sensor Picker

A new component `SensorPicker.svelte`:

- Input field with search, clear button, and dropdown.
- Lists sensors grouped by category.
- Shows current value and unit.
- Highlights the currently selected sensor.
- Supports keyboard navigation (ArrowDown/Up, Enter, Escape).
- Reusable in the inspector and the wizard.

### Right Sidebar Improvements

- **Tab persistence**: Remember the last active tab (`inspector`, `visual`, `groups`) across sessions in `localStorage`.
- **Tab badges**:
  - Inspector tab shows the selection count when > 0.
  - Groups tab shows the number of groups.
  - Visual tab has no badge.
- **Auto-switch logic refinement**: Only auto-switch to Inspector when the selection changes from empty to non-empty, not on every selection change. Respect the user's explicit tab choice.
- **Panel resize** (optional): Allow the right sidebar to be resized horizontally by dragging its left edge. Minimum 280px, maximum 480px. Persist width in `localStorage`. If it conflicts with the layout, keep it as a nice-to-have.

### Group Manager Improvements

The current group manager is a flat list. Phase C upgrades it:

- **Group cards**: Each group shows name, description, widget count, and a small color/icon tag.
- **Inline editing**: Click the name or description to edit inline; Enter to save, Escape to cancel.
- **Locate action**: Clicking a locate button selects the group and scrolls the canvas to the group's bounding box (using existing scroll behavior; pan/zoom is out of scope).
- **Canvas highlight**: When a group is selected in the manager, the group's widgets get a shared highlight color (e.g., a colored selection ring) and a temporary group label near the top-left widget.
- **Color tagging**: Assign a tag color to a group for visual organization. The tag color is stored on the `WidgetGroup` object (new optional field `tag_color?: string`).
- **Delete with confirmation**: Deleting a group requires confirmation if it contains widgets; use a small inline confirmation or a modal.
- **Import/export remains** as in Phase A/B, but add a warning if imported group IDs collide.

### Sensor-to-Widget Wizard

A new modal component `SensorToWidgetWizard.svelte` that can be opened from:

- The canvas empty state ("Add your first widget").
- A prominent button in the left sidebar header.
- A context menu item on the canvas background.

Steps:

1. **Select Sensor**: Searchable list of all available sensors, with recently used and favorites at the top.
2. **Choose Gauge**: Visual cards for each gauge type showing a live preview of the selected sensor's value. The preview uses the default theme.
3. **Configure**: Optional quick settings (label, color, size). Defaults are sensible.
4. **Place**: Place at the center of the canvas, at the current pointer position, or drag to a specific spot. The wizard closes and the widget is selected.

The wizard should be dismissible at any step and should not block the main UI. Expert users can bypass it via the left sidebar's quick-add buttons or drag-and-drop.

### New Components

- `SearchInput.svelte` — reusable themed search field with clear button.
- `SensorPicker.svelte` — searchable sensor dropdown.
- `SensorAddPopover.svelte` — gauge-type selector for sensor rows.
- `SensorToWidgetWizard.svelte` — step-by-step wizard.
- `CollapsibleSection.svelte` — reusable accordion section for the inspector.
- `BulkEditHeader.svelte` — summary/actions for multi-selection in the inspector.
- `GroupTagColorPicker.svelte` — small color picker for group tags using theme tokens.

### New/Updated Stores

- `client/src/lib/stores/inspector.ts` — inspector UI state (expanded sections, recent/favorite sensors, sensor search query).
- Extend `WidgetGroup` type with optional `tag_color?: string` and `icon?: string`.
- `localStorage` keys:
  - `ultimon_inspector_state` — tab, expanded sections, panel width.
  - `ultimon_sensor_inventory` — favorites and recent sensors.

## Success Criteria

1. `npm run lint`, `npm run check`, and `npm run build` pass in the `client` directory.
2. Left sidebar search filters sensors by name, category, source, and unit in real time.
3. Favorite and recently-used sensor sections appear at the top and persist across reloads.
4. The widget inspector supports bulk editing for multiple selected widgets with clear "Mixed" placeholders.
5. Per-gauge-type settings are available in the inspector and update the widget correctly.
6. The sensor picker is searchable and keyboard-navigable.
7. Group manager supports inline rename, description edit, locate action, and color tagging.
8. Sensor-to-widget wizard creates a widget at the requested location and can be opened from the sidebar, empty state, or canvas context menu.
9. Right sidebar tab selection persists, and tab badges reflect selection/group counts.
10. No new hardcoded colors are introduced; all new UI uses Phase A theme tokens.
11. No `any` types are introduced in new TypeScript code.

## Phased Plan

- **Phase A** (completed): Theme-token cleanup and theme system polish.
- **Phase B** (completed or in progress): Dashboard interaction layer — multi-select, snap, keyboard, undo/redo, empty state, sensor drop.
- **Phase C** (this design): Sidebar & inspector redesign — sensor search, bulk editing, per-gauge inspector, group manager improvements, sensor-to-widget wizard.
- **Future consideration**: Auto-layout algorithms, canvas zoom/pan, sensor category templates, and dashboard-wide preset wizard.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Inspector bulk-edit complexity makes the component too large | Split into sub-components (`InspectorSection`, `BulkEditHeader`, `GaugeSettingsPanel`) and keep the main component focused on orchestration. |
| Per-gauge settings duplicate logic already in gauge components | Create a shared `gaugeSettingsSchema` or `gaugeSettingsDefaults` map that both the inspector and gauges consume. |
| Sensor search/filtering performance on large sensor lists | Virtualize the sensor list if it exceeds 200 items; otherwise, simple filtering is sufficient. |
| Adding `localStorage` persistence can conflict with future backend sync | Keep persistence keys namespaced and document them; make persistence opt-out in the future if needed. |
| Wizard may frustrate expert users | Make every step skippable and provide the existing quick-add and drag-and-drop paths as faster alternatives. |
| Group tag colors may clash with themes | Restrict tag colors to a curated set derived from the active theme's primary/secondary/accent/danger/success/warning tokens. |
| Multi-selection inspector needs to handle mixed gauge types gracefully | Show only common gauge settings when all selected widgets share the same gauge type; hide gauge-specific section when mixed. |

## Notes

- Phase C must not regress Phase A's theme-token system or Phase B's interaction layer. New components should follow the same patterns: theme tokens, `@lucide/svelte` icons, focus rings, and transitions.
- The wizard and sensor picker should be reusable. Avoid duplicating sensor list rendering logic; create a shared `SensorList` or `SensorRow` component if it does not already exist.
- Consider adding a `GaugeType` metadata map (label, description, default settings, supported style overrides) in `client/src/lib/stores/themes.ts` or a new `client/src/lib/constants/gauges.ts` to reduce duplication between the inspector and the wizard.
- The right sidebar resize feature is optional. If it proves complex or conflicts with the fixed layout, defer it and keep the sidebar at a fixed width.
- All inspector updates that modify widget state should be wrapped in the appropriate `Command` (from Phase B) so undo/redo continues to work.
