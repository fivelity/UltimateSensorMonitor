# Ultimon UI/UX Improvement — Phase A Design

## Context

Ultimon Reimagined is a SvelteKit + FastAPI hardware-monitoring dashboard. The frontend already has a widget-based canvas, sidebars, a theme/visual-dimensions system, and multiple gauge types. The UI currently suffers from inconsistent styling: hardcoded Tailwind colors are mixed with CSS theme variables, icon usage is inconsistent, and the built-in theme presets are not fully applied across every component. This design focuses on the first phase of a larger UI/UX improvement effort.

## Goals

1. Eliminate all hardcoded colors in components so every UI element is driven by theme tokens.
2. Ship three polished, fully-defined themes:
   - **Professional** — clean, light, business-focused default.
   - **Gamer HUD** — dark background with neon accents, high contrast.
   - **Glassmorphism** — translucent layers, soft gradients, blur effects.
3. Make the theme switcher visible and easy to reach.
4. Unify icon usage to `@lucide/svelte` and standardize button, focus, and transition styling.
5. Connect the existing **Materiality** slider to glassmorphism/blur intensity where feasible.

## Scope

### In Scope

- Audit and update all components under `client/src/lib/components/`:
  - `TopBar.svelte`
  - `LeftSidebar.svelte`
  - `RightSidebar.svelte`
  - `DashboardCanvas.svelte`
  - `ConnectionStatus.svelte`
  - `ContextMenu.svelte`
  - `WidgetInspector.svelte`
  - `VisualDimensionsPanel.svelte`
  - `WidgetGroupManager.svelte`
  - `WidgetContainer.svelte` and its widget-core subcomponents
  - All gauge components (`RadialGauge.svelte`, `LinearGauge.svelte`, `GraphGauge.svelte`, `TextGauge.svelte`, `GlassmorphicGauge.svelte`, `ImageSequenceGauge.svelte`)
- Refine `client/src/lib/stores/themes.ts` presets and token set.
- Update `VisualDimensionsPanel.svelte` to add a theme preset selector and a live preview chip.
- Add a visible theme switcher to the `TopBar.svelte` or `VisualDimensionsPanel.svelte`.
- Ensure the app layout (`+layout.svelte`) applies the active theme tokens consistently.

### Out of Scope

- No new charting library dependency (e.g., `layerchart@next`).
- No new component library dependency (e.g., `shadcn-svelte`).
- No structural refactor of stores or the widget system.
- No new widget types or gauges.
- No server-side changes.

## Design Details

### Theme Token System

The existing CSS custom property approach (`--theme-primary`, `--theme-surface`, etc.) will be kept and expanded. The current set of tokens is:

- `--theme-primary`
- `--theme-secondary`
- `--theme-accent`
- `--theme-background`
- `--theme-surface`
- `--theme-border`
- `--theme-text`
- `--theme-text-muted`

Additional tokens may be added if needed for glassmorphism variants:

- `--theme-surface-transparent`
- `--theme-backdrop-blur`
- `--theme-elevation-shadow`

### Theme Presets

`client/src/lib/stores/themes.ts` will define the following refined presets:

1. **Professional** — `professional_default`
   - Background: `#f8fafc`
   - Surface: `#ffffff`
   - Primary: `#3b82f6`
   - Secondary: `#6366f1`
   - Text: `#1e293b`
   - Muted: `#64748b`
   - Border: `#e2e8f0`
   - Materiality default: 0.3
   - Blur: disabled

2. **Gamer HUD** — `gamer_immersive`
   - Background: `#0a0a0a`
   - Surface: `#1a1a1a`
   - Primary: `#00ff41`
   - Secondary: `#ff0080`
   - Text: `#ffffff`
   - Muted: `#a0a0a0`
   - Border: `#333333`
   - Materiality default: 0.8
   - Blur: enabled

3. **Glassmorphism** — `glassmorphism_modern`
   - Background: `#0f172a`
   - Surface: `rgba(255, 255, 255, 0.08)`
   - Primary: `#38bdf8`
   - Secondary: `#818cf8`
   - Text: `#f8fafc`
   - Muted: `#94a3b8`
   - Border: `rgba(255, 255, 255, 0.12)`
   - Materiality default: 0.9
   - Blur: enabled, intensity tied to materiality slider

### Materiality-to-Glassmorphism Mapping

The existing `materiality` visual dimension (0.0–1.0) will be used to interpolate glassmorphism intensity:

- `materiality < 0.4` → flat design, no blur.
- `0.4 <= materiality < 0.7` → subtle surface translucency, light blur.
- `materiality >= 0.7` → full glassmorphism: translucent surfaces, stronger blur, elevated shadows.

This will be applied via a centralized style utility or by updating the layout-level CSS variable injection. The current `visualUtils` store helpers should own this mapping.

### Component Audit Rules

Every component must follow these rules after the cleanup:

1. **No hardcoded Tailwind colors** such as `bg-blue-500`, `text-gray-700`, `bg-gray-100`, etc.
2. **No hardcoded hex values in component files** (except for theme preset definitions).
3. **Icons must come from `@lucide/svelte`**; no inline SVG icons.
4. **Focus rings** must use `ring-2 ring-[var(--theme-primary)] ring-offset-2 ring-offset-[var(--theme-background)]`.
5. **Transitions** should be consistent (`transition-colors`, `transition-transform`, `duration-200`, `ease-out`).
6. **Buttons** must use a shared set of utility classes or small wrapper components (Button, IconButton) to avoid repetition.

### Theme Switcher UI

- Add a theme preset dropdown to `VisualDimensionsPanel.svelte` under the **Color Scheme** section.
- Show a small live preview chip (a colored square) next to the selected theme name.
- Persist the selected theme to `localStorage` via the existing `visualSettings` persistence path if available, or via a dedicated theme key.
- The current theme preset should be reflected in the `currentTheme` store.

### Gauge Updates

- Gauges already use `var(--theme-primary)` and `var(--theme-surface)` in many places; ensure all remaining hardcoded colors are removed.
- `GraphGauge.svelte` should use theme tokens for axis/grid colors and the line/fill color defaults.
- `GlassmorphicGauge.svelte` should respond to materiality/blur settings.

### TopBar Updates

- Replace hardcoded edit/view mode colors with theme tokens.
- Unify the icon-button styling for preset, undo/redo, and settings actions.
- Add the theme preset selector to the top bar if space permits; otherwise keep it in the right sidebar.

### Sidebar Updates

- `LeftSidebar.svelte`: remove hardcoded `bg-blue-500`, `bg-green-500`, etc., on quick-add buttons. Use semantic variants (`primary`, `secondary`, `success`) mapped to theme tokens.
- `RightSidebar.svelte`: replace inline SVG close icon with `X` from `@lucide/svelte`. Ensure tab active/inactive states use theme tokens.

### Canvas Updates

- Replace hardcoded selection rectangle colors (`#3b82f6`, `#60a5fa`) with theme tokens.
- Ensure grid overlay uses theme border tokens.

### Accessibility

- All interactive elements must have visible focus states.
- Icon-only buttons must have `title` attributes and `aria-label`.
- Maintain keyboard support for widget selection and nudging (selection already supports Enter/Space; nudging will be added in Phase B).

## Success Criteria

1. `npm run lint` and `npm run check` pass in the `client` directory.
2. No hardcoded Tailwind color classes or hex values remain in component files (except theme definitions).
3. All three themes render correctly across the main UI surfaces: top bar, sidebars, canvas, widgets, and gauges.
4. The theme switcher is visible and changes the theme immediately.
5. The Materiality slider visibly changes the glassmorphism intensity when the Glassmorphism theme is active.

## Phased Plan

- **Phase A** (this design): Theme-token cleanup and theme system polish.
- **Phase B** (future): Dashboard interactions — snap-to-grid drag/resize, multi-select improvements, empty states, keyboard nudging.
- **Phase C** (future): Sidebar & inspector redesign — sensor search, better property grouping, improved group management.
- **Future consideration**: Evaluate `layerchart@next` for the `GraphGauge` and `shadcn-svelte` for form controls in later phases.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind CSS v4 class-based syntax differences | Test all class changes in the browser; use Tailwind v4 compatible utilities only. |
| Theme token explosion | Keep the token set small; add only `--theme-surface-transparent`, `--theme-backdrop-blur`, and `--theme-elevation-shadow` if needed. |
| Gauge rendering regressions | Verify each gauge type in the demo-data mode after changes. |
| Losing user customization | Do not remove existing custom color scheme support; only refine the default presets. |

## Notes

- The app currently uses `runes: true` in Svelte 5. All new and updated components must continue using Svelte 5 runes syntax.
- The existing `@lucide/svelte` dependency is already in place; no new icon dependency is needed.
- The current `d3` dependency used by `GraphGauge.svelte` will remain; no chart library replacement is planned for Phase A.
