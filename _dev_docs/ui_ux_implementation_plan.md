---
creation-date: {date}
document-aliases: 'DESIGN_IMPLEMENTATION_PLAN.md'
document-revision: 1.2
project-aliases: 'Ultimate Sensor Monitor Reimagined', 'Ultimon Reimagined', 'USMR',
project-version: 1.0
---

## 

## Ultimon Reimagined: Phased UI Implementation & Risk Mitigation Plan

**Purpose:** This document provides a detailed, actionable, and risk-aware phased implementation plan for the Ultimon Reimagined application. It breaks down development into manageable phases and tasks, outlining technical considerations including specific UI layout components, potential challenges, and specific risk mitigation strategies for each. This plan is designed to guide the core UI / UX development and ensure clarity on objectives and potential obstacles throughout the project lifecycle.

**Core Layout Structure Overview:**

- **Main Dashboard Canvas:** Dominant central area for widget placement and display.

- **Left Sidebar (Collapsible):** Houses "Palette & Sources" like the `SensorSourceList` and potentially widget type selectors.

- **Right Sidebar (Collapsible):** Contains "Inspector & Dimensions" panels, including the `WidgetInspector` and global `VisualDimensions` controls.

- **Top Bar / Main Toolbar:** For global actions like mode switching (View/Edit), preset management, alignment tools, and undo/redo.

- **Modal Popups:** Used for tasks like preset selection/naming, color picking, font selection, and confirmations.

- **Context Menus:** Right-click functionality on widgets for quick actions in Edit Mode.

### Phase 1: Core Layout & Basic Customization (Minimum Viable Product - MVP)

This phase focuses on establishing the foundational elements of the dashboard, including basic widget rendering, placement, and initial user customization options, along with the core application shell.

#### 1.1. Application Shell & Micro-Grid Canvas Implementation

- [ ] **Task:** Implement the main application shell, including the `DashboardCanvas.svelte` component that will serve as the primary area for widgets. Establish the underlying micro-grid coordinate system conceptually (e.g., units of 5px or 0.5rem). Implement the basic structure for the **Top Bar** with a mode toggle (View/Edit).
  
  - **Technical Implementation Considerations:**
    
    - `DashboardCanvas.svelte`: A Svelte component acting as a relative container.
    
    - Micro-grid: Initially a visual guide (e.g., repeating background CSS gradient in "Edit Mode").
    
    - CSS Custom Properties for grid unit size if a visual grid overlay is implemented.
    
    - **Top Bar (`TopBar.svelte`):** Basic component with a button to toggle a Svelte store value representing the current mode (e.g., `isEditMode`).
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Ensuring the canvas and overall shell scale correctly.
      
      - **Mitigation:** Use relative units (`%`, `vw`, `vh`) for the canvas and main layout containers.
    
    - **Challenge:** Over-complicating initial micro-grid or mode switching logic.
      
      - **Mitigation:** Keep the visual grid simple. Mode switching initially just toggles visibility of edit-specific UI elements.

#### 1.2. Basic `WidgetShell.svelte` Development

- [ ] **Task:** Develop the fundamental widget component (`WidgetShell.svelte`) that accepts `posX`, `posY`, `width`, `height` props. It should initially display a single sensor's name and its live value.
  
  - **Technical Implementation Considerations:**
    
    - Widgets absolutely positioned within `DashboardCanvas.svelte`.
    
    - Props for `width`/`height` set dimensions.
    
    - Integrate with `sensorDataStore` for live data.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Reactivity with many `WidgetShell` instances.
      
      - **Mitigation:** Target performance for 10-20 widgets for MVP.
    
    - **Challenge:** Binding sensor data to the correct widget.
      
      - **Mitigation:** Each widget needs a unique ID and `sensorId` prop. `sensorDataStore` should allow easy lookup.

#### 1.3. Drag-and-Drop & Grid Snap Implementation

- [ ] **Task:** Implement drag-and-drop for `WidgetShell.svelte` instances within `DashboardCanvas.svelte`. Implement basic snapping to micro-grid intersections.
  
  - **Technical Implementation Considerations:**
    
    - Svelte event handling.
    
    - Update `posX`/`posY` during `mousemove`.
    
    - Snap logic: Adjust `posX`/`posY` on drag end to nearest grid intersection.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Janky drag behavior.
      
      - **Mitigation:** Optimize drag logic. Debounce store updates if needed. Snap on `mouseup` if real-time is slow.
    
    - **Challenge:** Accurate positioning relative to canvas (offsets, scroll).
      
      - **Mitigation:** Use `event.clientX/clientY` and `getBoundingClientRect()`.
    
    - **Challenge:** Touch support.
      
      - **Mitigation:** Add touch event handlers. May defer full touch optimization. 

#### 1.4. `SensorSourceList.svelte` & Left Sidebar Implementation

- [ ] **Task:** Implement the **Left Sidebar (`LeftSidebar.svelte`)** to be collapsible. Integrate `SensorSourceList.svelte` within it, allowing users to select a sensor to add a new `WidgetShell.svelte` to the dashboard.
  
  - **Technical Implementation Considerations:**
    
    - `LeftSidebar.svelte`: A Svelte component, styled with Tailwind CSS, with a button to toggle its collapsed state (e.g., by changing its width or using `transform`).
    
    - `SensorSourceList.svelte`: Reads sensors from `sensorDataStore`. Clicking a sensor adds a new widget object to `widgetsStore`.
    
    - `DashboardCanvas.svelte` reactively renders widgets from `widgetsStore`.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Managing state of dynamically added widgets and sidebar visibility.
      
      - **Mitigation:** Use a Svelte writable store (`widgetsStore`) for widget configurations. Use another store or local component state for sidebar collapse status.
    
    - **Challenge:** Ensuring unique IDs for new widgets.
      
      - **Mitigation:** Use UUIDs or a counter for widget IDs.

#### 1.5. Initial Visual Dimensions & Right Sidebar (Stub)

- [ ] **Task:** Implement global color scheme selection and basic global font selection using CSS Custom Properties. Create a stub for the **Right Sidebar (`RightSidebar.svelte`)** and a basic UI control panel within it for these initial settings.
  
  - **Technical Implementation Considerations:**
    
    - Define CSS Custom Properties (`--theme-primary`, etc.) on a root element.
    
    - `RightSidebar.svelte`: Basic collapsible sidebar structure.
    
    - `VisualDimensionsPanel_Phase1.svelte` (inside Right Sidebar): Simple Svelte component with color pickers/dropdowns updating a Svelte store, which then updates CSS Custom Properties.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Intuitive UI controls for theme settings with real-time feedback.
      
      - **Mitigation:** Keep the initial panel simple. Changes immediately reflect on the dashboard.
    
    - **Challenge:** Persistence of settings.
      
      - **Mitigation:** Persist in `localStorage` (Task 1.6).

#### 1.6. Local Preset System & Top Bar Integration

- [ ] **Task:** Implement basic save/load for layouts and visual settings using `localStorage`. Add "Save Layout" and "Load Layout" buttons to the **Top Bar**.
  
  - **Technical Implementation Considerations:**
    
    - Serialize `widgetsStore` and visual dimensions store to JSON for `localStorage`.
    
    - Implement load function to parse JSON and hydrate stores.
    
    - Add buttons to `TopBar.svelte`. Clicking "Load Layout" might initially load a single predefined slot or a very simple list (modal deferred).
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Data corruption or no saved data in `localStorage`.
      
      - **Mitigation:** Use `try...catch` for `JSON.parse()`. Provide defaults.
    
    - **Challenge:** Schema changes for saved data in later phases.
      
      - **Mitigation:** For MVP, less critical. Future: versioning in JSON.

### Phase 2: Enhanced Styling & Widget Functionality

This phase builds upon the MVP by adding more sophisticated styling options, diverse widget types, and more detailed widget configuration, further developing the sidebars and introducing modals.

#### 2.1. Expanded Visual Dimensions in Right Sidebar

- [ ] **Task:** Enhance the `VisualDimensionsPanel` within the **Right Sidebar**. Introduce more controls for "Materiality & Depth" (opacity, basic shadows) and "Animation & Dynamism" (simple Svelte transitions).
  
  - **Technical Implementation Considerations:**
    
    - Add new CSS Custom Properties (`--widget-opacity`, etc.).
    
    - Expand `VisualDimensionsPanel_Phase1.svelte` (or create `VisualDimensionsPanel_Phase2.svelte`) with sliders/toggles.
    
    - Apply these to `WidgetShell.svelte` styles. Use Svelte transitions for widget add/remove.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Performance of shadows/transitions with many widgets.
      
      - **Mitigation:** Default to subtle effects. Test performance.
    
    - **Challenge:** Cohesive look as options grow.
      
      - **Mitigation:** Sensible defaults. Organized UI panel.

#### 2.2. Versatile Gauge Types

- [ ] **Task:** Develop a few more distinct gauge types (e.g., linear bar, simple radial). `WidgetShell.svelte` to dynamically render the chosen type.
  
  - **Technical Implementation Considerations:**
    
    - New Svelte components for gauges (`LinearBarGauge.svelte`, `RadialGauge.svelte`).
    
    - `WidgetShell.svelte` takes `gaugeType` prop. Use `<svelte:component this={...}/>`.
    
    - Gauges receive sensor data as props.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Visually appealing, configurable, performant gauges.
      
      - **Mitigation:** Simple visual designs. SVG for drawing. Defer complex customization.
    
    - **Challenge:** Passing data/config to dynamic gauges.
      
      - **Mitigation:** Clear prop interface for all gauges.

#### 2.3. Widget Inspector Panel (Initial) in Right Sidebar

- [ ] **Task:** Create the first version of the `WidgetInspector.svelte` panel within the **Right Sidebar**. When a widget is selected, this panel allows configuration of its `gaugeType`, label/unit visibility, and custom text.
  
  - **Technical Implementation Considerations:**
    
    - `WidgetInspector.svelte` placed within `RightSidebar.svelte` (perhaps as a tab or section).
    
    - Svelte store for selected widget ID. Inspector reads/writes to `widgetsStore` for that widget.
    
    - Controls: dropdown for `gaugeType`, toggles, text inputs.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Robust two-way data binding between inspector and widget state.
      
      - **Mitigation:** Inspector updates `widgetsStore`; widget re-renders from store.
    
    - **Challenge:** Cluttered inspector UX.
      
      - **Mitigation:** Group settings. Clear labels. Limited options initially.

#### 2.4. Backend Preset Storage & Preset Modals

- [ ] **Task:** Integrate FastAPI backend for preset saving/loading. Implement **Modal Popups** for preset management (naming new presets, selecting from a list to load). Update "Save" / "Load" buttons in **Top Bar** to trigger these modals.
  
  - **Technical Implementation Considerations:**
    
    - FastAPI endpoints (`/presets POST`, `/presets GET`) with Pydantic validation.
    
    - Frontend `fetch` requests.
    
    - `PresetNameModal.svelte`: Appears on save, prompts for name.
    
    - `PresetListModal.svelte`: Appears on load, lists presets fetched from backend, allows selection.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** User authentication for presets.
      
      - **Mitigation:** If full auth is complex, start with device-specific presets (backend maps a client-generated ID) or public presets.
    
    - **Challenge:** Error handling for network/backend.
      
      - **Mitigation:** Robust frontend error handling. Clear backend error responses.
    
    - **Challenge:** Security of preset data.
      
      - **Mitigation:** Sanitize user-provided text on backend and frontend.

### Phase 3: Advanced Layout, Rich Interactivity & Full Customization

This phase focuses on delivering the full vision, including advanced layout tools, richer interactions, and comprehensive customization, fully fleshing out all UI components.

#### 3.1. Widget Locking & Grouping

- [ ] **Task: Implement Widget Locking:** Develop a mechanism to lock/unlock individual widgets (or a selection of widgets) to prevent accidental movement or resizing.
  
  - **Technical Implementation Considerations:**
    
    - Add an `isLocked` boolean property to each widget's configuration in `widgetsStore`.
    
    - In Edit Mode, if `isLocked` is true for a widget, its drag and resize interactions/handles should be disabled.
    
    - Provide a clear visual indicator for locked widgets (e.g., a small lock icon overlay on the widget in Edit Mode).
    
    - The lock toggle control could be placed in the `WidgetInspector.svelte` panel and/or the `WidgetContextMenu.svelte`.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Users forgetting widgets are locked and being confused when they can't move them.
      
      - **Mitigation:** Ensure the visual indicator for locked widgets is clear. Consider a global "Unlock All Widgets" button in the Top Bar or a settings menu for convenience if many widgets might be locked.
    
    - **Challenge:** Implementing the lock toggle in multiple places (inspector, context menu) and keeping state synchronized.
      
      - **Mitigation:** Ensure both UI elements modify the same `isLocked` property in the `widgetsStore` for the respective widget.

- [ ] **Task: Implement Widget Grouping:** Allow users to select multiple widgets and group them so they can be moved as a single unit. Lay groundwork for potential shared styling and group export/import.
  
  - **Technical Implementation Considerations:**
    
    - **Data Structure:** Define how groups are represented. A group object could exist in `widgetsStore` containing an array of member widget IDs, its own `posX`/`posY`, and dimensions. Alternatively, widgets could have an optional `groupId` and relative positioning data.
    
    - **Grouping UI:** Users select multiple widgets (e.g., shift-click or marquee selection), then click a "Group" button (e.g., in Top Bar or context menu). An "Ungroup" option should also be available.
    
    - **Group Movement:** Dragging a group should move all its member widgets while maintaining their relative positions within the group.
    
    - **Selection:** Allow selection of the entire group or individual widgets within a group (perhaps via double-click or a specific selection mode).
    
    - **Initial Styling Consideration:** For now, focus on grouping for movement. Shared styling can be a future enhancement on top of this.
    
    - **Preset Integration:** Ensure widget group information is saved and loaded as part of the dashboard presets.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Managing the complex state of grouped widgets, especially their relative and absolute positions.
      
      - **Mitigation:** Design the data structure for groups carefully. When a group is moved, calculate new absolute positions for all member widgets based on the group's delta movement.
    
    - **Challenge:** Developing an intuitive UI for selecting widgets for grouping, creating groups, selecting groups vs. widgets within groups, and ungrouping.
      
      - **Mitigation:** Start with basic multi-select (if not already present) and a "Group" button. Provide clear visual feedback in Edit Mode for group boundaries (e.g., a temporary bounding box around the group when selected).
    
    - **Challenge:** Handling nested groups if desired (can significantly increase complexity).
      
      - **Mitigation:** For the initial implementation, do not support nested groups. This can be considered much later if there's strong user demand.

- [ ] **Task: Implement Sharable Widget Groups (Basic Export/Import):** Allow a user to export the configuration of a created widget group (including its member widgets' configurations, relative positions, and any applied group-level styles if implemented) as a JSON snippet. Allow importing such a snippet to add the group to the current dashboard.
  
  - **Technical Implementation Considerations:**
    
    - **Export:** Function to serialize a selected group and its widgets into a JSON structure. This JSON can be copied to the clipboard or downloaded as a `.json` file.
    
    - **Import:** UI to paste JSON or upload a `.json` file. Logic to parse the JSON, validate its structure, and add the new group and its widgets to the `widgetsStore`. Handle potential ID conflicts for imported widgets by generating new unique IDs.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Ensuring the JSON structure for shared groups is robust and versionable if it evolves.
      
      - **Mitigation:** Define a clear schema for the group JSON and include a version number.
    
    - **Challenge:** Handling ID conflicts when importing widgets that might have IDs already present in the current dashboard.
      
      - **Mitigation:** Upon import, always generate new unique IDs for the imported group and all its member widgets, while preserving their internal structure and relative configurations.
    
    - **Challenge:** UI for managing imported groups (e.g., where they are placed on the canvas initially).
      
      - **Mitigation:** Imported groups could be placed at a default position (e.g., center of the current view or at 0,0) for the user to then move.

#### 3.2. Advanced Snapping, Dynamic Alignment Guidelines & Context Menus

- [ ] **Task:** Implement widget-to-widget edge/center snapping. Implement dynamic alignment guidelines. Implement **Context Menus** (right-click) on widgets in Edit Mode for quick actions (including group/ungroup, lock/unlock if applicable).
  
  - **Technical Implementation Considerations:**
    
    - Widget Snapping: Iterate nearby widgets for snap points.
    
    - Dynamic Guidelines: Render temporary SVG/DIV lines.
    
    - `WidgetContextMenu.svelte`: Appears on right-click, offers actions like "Duplicate," "Delete," "Bring to Front," "Group," "Ungroup," "Lock/Unlock."
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Computational cost of widget snapping.
      
      - **Mitigation:** Optimize search (proximity).
    
    - **Challenge:** Visual clutter from guidelines.
      
      - **Mitigation:** Show for strongest snaps. Subtle lines.
    
    - **Challenge:** Implementing a robust and well-positioned context menu.
      
      - **Mitigation:** Use a library or carefully manage positioning relative to mouse click and viewport.

#### 3.3. Full Visual Dimension Controls & Advanced Modals

- [ ] **Task:** Implement the complete set of UI controls in the `VisualDimensionsPanel` (in **Right Sidebar**) for all defined Visual Dimensions, including nuanced options and potentially advanced **Modal Popups** for complex editors (e.g., gradient editor, detailed font selector).
  
  - **Technical Implementation Considerations:**
    
    - Expand `VisualDimensionsPanel` significantly. Add corresponding CSS Custom Properties.
    
    - `GradientEditorModal.svelte`, `FontSelectorModal.svelte` if needed.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Overwhelming `VisualDimensionsPanel` UI.
      
      - **Mitigation:** Tabs, accordions, progressive disclosure. Good defaults.
    
    - **Challenge:** Ensuring all visual combinations are usable.
      
      - **Mitigation:** Extensive testing. Sensible input ranges.

#### 3.4. Comprehensive Preset Sharing & Top Bar Enhancements

- [ ] **Task:** Implement robust JSON export/import for full dashboard presets (triggered from **Top Bar** or preset modals), including schema validation. Add Undo/Redo buttons to the **Top Bar**.
  
  - **Technical Implementation Considerations:**
    
    - Frontend: "Export Preset" (generates JSON file), "Import Preset" (uploads JSON file).
    
    - Schema validation on import.
    
    - Undo/Redo: Requires a history stack of dashboard states (or actions to reverse/reapply). This can be complex.
  
  - **Potential Challenges & Specific Risk Mitigation Strategies:**
    
    - **Challenge:** Handling preset versioning/schema changes.
      
      - **Mitigation:** Version number in JSON. Migration logic or graceful error handling.
    
    - **Challenge:** Implementing a reliable undo/redo system.
      
      - **Mitigation:** Start with a simple history stack (e.g., storing snapshots of `widgetsStore` and `visualDimensionsStore`). Limit history depth if performance is an issue. Consider action-based undo/redo for more fine-grained control if snapshotting is too heavy.

This Phased Implementation Plan provides a structured approach to developing Ultimon Reimagined. Regular review and adaptation will be key to success.
