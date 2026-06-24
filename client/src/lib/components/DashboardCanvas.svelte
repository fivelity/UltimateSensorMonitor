<script lang="ts">
  /**
   * DashboardCanvas — unified, tool-driven canvas.
   *
   * Replaces the legacy dashboard/grid mode split. The canvas always supports
   * free positioning with optional grid-snap. Pointer behavior is driven by
   * the active tool from the FloatingToolbar:
   *   - select: rubber-band selection + click-to-select
   *   - move:   widgets are draggable; clicking a widget starts drag
   *   - pan:    canvas pans on pointer drag; widgets are non-interactive
   *   - add:    clicking empty canvas opens the widget wizard
   */

  import {
    activeSnapGuides,
    dashboardInteraction,
    handleKeyboardShortcut,
    selectedWidgets,
    visualSettings,
    widgetArray,
    widgetCount,
    widgetUtils,
  } from "$lib/stores";
  import {
    activeTool,
    pendingAddPosition,
    type ToolId,
  } from "$lib/stores/activeTool";
  import { uiUtils } from "$lib/stores/core/ui";
  import { AddWidgetCommand, historyStore } from "$lib/stores/history";
  import type { Bounds, GaugeType, Point, WidgetConfig } from "$lib/types";
  import { snapToGrid } from "$lib/utils/geometry";
  import { logger } from "$lib/utils/logger";
  import { MousePointer2, Plus, Sparkles } from "@lucide/svelte";
  import { get } from "svelte/store";
  import SnapGuides from "./SnapGuides.svelte";
  import WidgetContainer from "./widgets/core/WidgetContainer.svelte";

  interface Props {
    onopenLeftSidebar?: () => void;
    onopenWizard?: () => void;
  }

  const { onopenLeftSidebar, onopenWizard }: Props = $props();

  interface SelectionRect {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  let canvasElement: HTMLDivElement | undefined = $state();
  let canvasContentElement: HTMLDivElement | undefined = $state();
  let isSelecting = $state(false);
  let selectionStart = $state<Point>({ x: 0, y: 0 });
  let selectionEnd = $state<Point>({ x: 0, y: 0 });
  let isDragOver = $state(false);

  // Pan tool state
  let isPanning = $state(false);
  let panStart = $state<Point>({ x: 0, y: 0 });
  let panScrollStart = $state<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  const currentTool = $derived<ToolId>($activeTool);
  const isPanTool = $derived(currentTool === "pan");
  const isAddTool = $derived(currentTool === "add");
  const isEditable = $derived(
    currentTool === "select" || currentTool === "move" || currentTool === "add",
  );

  $effect(() => {
    if (!canvasElement) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (get(dashboardInteraction).mode === "dragging") return;

      const target = event.target as Element;

      // Pan tool: always pan on canvas drag
      if (isPanTool) {
        startPan(event);
        return;
      }

      // Only react to clicks on the canvas background (not widgets)
      if (
        target === canvasElement ||
        target === canvasContentElement ||
        target.closest("[data-canvas-background]")
      ) {
        if (isAddTool) {
          // Add tool: open wizard at cursor position
          handleAddAtCursor(event);
          return;
        }

        if (!isEditable) {
          uiUtils.clearSelection();
          return;
        }

        // Select tool: rubber-band selection
        if (currentTool === "select") {
          startSelection(event);
        } else {
          // Move tool: clear selection on background click
          if (!event.shiftKey) uiUtils.clearSelection();
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isPanning) updatePan(event);
      else if (isSelecting) updateSelection(event);
    };

    const handleMouseUp = (_event: MouseEvent) => {
      if (isPanning) endPan();
      else if (isSelecting) finishSelection(_event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardShortcut(event);
    };

    canvasElement.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvasElement?.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  // --- Pan tool ---
  function startPan(event: MouseEvent) {
    if (!canvasElement) return;
    isPanning = true;
    panStart = { x: event.clientX, y: event.clientY };
    panScrollStart = {
      left: canvasElement.scrollLeft,
      top: canvasElement.scrollTop,
    };
  }

  function updatePan(event: MouseEvent) {
    if (!isPanning || !canvasElement) return;
    const deltaX = event.clientX - panStart.x;
    const deltaY = event.clientY - panStart.y;
    canvasElement.scrollLeft = panScrollStart.left - deltaX;
    canvasElement.scrollTop = panScrollStart.top - deltaY;
  }

  function endPan() {
    isPanning = false;
  }

  // --- Selection (select tool) ---
  function startSelection(event: MouseEvent) {
    if (!canvasElement) return;
    isSelecting = true;
    const rect = canvasElement.getBoundingClientRect();
    selectionStart = {
      x: event.clientX - rect.left + canvasElement.scrollLeft,
      y: event.clientY - rect.top + canvasElement.scrollTop,
    };
    selectionEnd = { ...selectionStart };

    if (!event.shiftKey) {
      uiUtils.clearSelection();
    }
  }

  function updateSelection(event: MouseEvent) {
    if (!isSelecting || !canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    selectionEnd = {
      x: event.clientX - rect.left + canvasElement.scrollLeft,
      y: event.clientY - rect.top + canvasElement.scrollTop,
    };
  }

  function finishSelection(event: MouseEvent) {
    if (!isSelecting) return;
    isSelecting = false;

    const selRect: Bounds = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };

    if (selRect.width > 5 && selRect.height > 5) {
      const selectedIds: string[] = [];

      $widgetArray.forEach((widget) => {
        const widgetRect: Bounds = {
          x: widget.pos_x,
          y: widget.pos_y,
          width: widget.width,
          height: widget.height,
        };

        if (boundsIntersect(selRect, widgetRect)) {
          selectedIds.push(widget.id);
        }
      });

      if (selectedIds.length > 0) {
        if (event.shiftKey) {
          selectedIds.forEach((id) => uiUtils.addToSelection(id));
        } else {
          selectedWidgets.set({ type: "widget", ids: selectedIds });
        }
      }
    }
  }

  function boundsIntersect(a: Bounds, b: Bounds): boolean {
    return !(
      b.x > a.x + a.width ||
      b.x + b.width < a.x ||
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }

  // --- Add tool ---
  function handleAddAtCursor(event: MouseEvent) {
    if (!canvasContentElement) return;
    const contentRect = canvasContentElement.getBoundingClientRect();
    const x = Math.max(0, event.clientX - contentRect.left);
    const y = Math.max(0, event.clientY - contentRect.top);
    // Store the drop position for the wizard to use, then open the wizard
    pendingAddPosition.set({ x, y });
    onopenWizard?.();
  }

  function handleCanvasRightClick(event: MouseEvent) {
    if (!isEditable) return;
    event.preventDefault();
    uiUtils.showContextMenu(event.clientX, event.clientY, { type: "canvas" });
  }

  function handleWidgetUpdated(data: {
    id: string;
    updates: Partial<WidgetConfig>;
  }) {
    widgetUtils.updateWidget(data.id, data.updates);
  }

  function handleWidgetSelected(data: { id: string; multiSelect: boolean }) {
    uiUtils.selectWidget(data.id, data.multiSelect);
  }

  function handleWidgetContextMenu(data: { id: string; x: number; y: number }) {
    uiUtils.showContextMenu(data.x, data.y, { type: "widget", id: data.id });
  }

  function handleWidgetDelete(data: { id: string }) {
    widgetUtils.removeWidget(data.id);
    uiUtils.clearSelection();
  }

  function handleDragOver(event: DragEvent) {
    if (!isEditable) return;
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    const target = event.target as Element;
    if (target === canvasElement || target === canvasContentElement) {
      isDragOver = false;
    }
  }

  function handleDrop(event: DragEvent) {
    if (!isEditable || !canvasContentElement) return;
    event.preventDefault();
    isDragOver = false;

    const sensorId = event.dataTransfer?.getData("sensorId");
    const gaugeType = (event.dataTransfer?.getData("gaugeType") ||
      "text") as GaugeType;
    if (!sensorId) return;

    const contentRect = canvasContentElement.getBoundingClientRect();
    let x = event.clientX - contentRect.left;
    let y = event.clientY - contentRect.top;

    if ($visualSettings.snap_to_grid && $visualSettings.grid_size > 0) {
      x = snapToGrid(x, $visualSettings.grid_size);
      y = snapToGrid(y, $visualSettings.grid_size);
    }

    x = Math.max(0, x);
    y = Math.max(0, y);

    createWidgetFromSensor(sensorId, gaugeType, x, y);
  }

  function createWidgetFromSensor(
    sensorId: string,
    gaugeType: GaugeType,
    x: number,
    y: number,
  ) {
    const widget: WidgetConfig = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sensor_id: sensorId,
      gauge_type: gaugeType,
      pos_x: x,
      pos_y: y,
      width: 200,
      height: 120,
      rotation: 0,
      z_index: 1,
      is_locked: false,
      show_label: true,
      show_unit: true,
      gauge_settings: {},
      style_settings: {},
    };

    historyStore.executeCommand(
      new AddWidgetCommand(
        widget,
        widgetUtils.addWidget,
        widgetUtils.removeWidget,
      ),
    );
    selectedWidgets.set({ type: "widget", ids: [widget.id] });
    logger.debug(`[DashboardCanvas] Created widget from sensor ${sensorId}`);
  }

  export function scrollToBounds(bounds: Bounds) {
    if (!canvasElement) return;

    const padding = 40;
    const targetLeft = Math.max(0, bounds.x - padding);
    const targetTop = Math.max(0, bounds.y - padding);
    const targetRight = bounds.x + bounds.width + padding;
    const targetBottom = bounds.y + bounds.height + padding;

    const viewportWidth = canvasElement.clientWidth;
    const viewportHeight = canvasElement.clientHeight;

    if (targetRight > canvasElement.scrollLeft + viewportWidth) {
      canvasElement.scrollLeft = targetRight - viewportWidth;
    }
    if (targetLeft < canvasElement.scrollLeft) {
      canvasElement.scrollLeft = targetLeft;
    }
    if (targetBottom > canvasElement.scrollTop + viewportHeight) {
      canvasElement.scrollTop = targetBottom - viewportHeight;
    }
    if (targetTop < canvasElement.scrollTop) {
      canvasElement.scrollTop = targetTop;
    }
  }

  const selectionRect = $derived<SelectionRect | null>(
    isSelecting
      ? {
          left: Math.min(selectionStart.x, selectionEnd.x),
          top: Math.min(selectionStart.y, selectionEnd.y),
          width: Math.abs(selectionEnd.x - selectionStart.x),
          height: Math.abs(selectionEnd.y - selectionStart.y),
        }
      : null,
  );

  // Canvas cursor based on active tool
  const canvasCursor = $derived(
    isPanTool
      ? isPanning
        ? "grabbing"
        : "grab"
      : isAddTool
        ? "copy"
        : currentTool === "select"
          ? "default"
          : "default",
  );

  // Widgets are interactive only in select / move / add modes
  const widgetsInteractive = $derived(!isPanTool);
</script>

<div
  bind:this={canvasElement}
  class="dashboard-canvas w-full h-full relative overflow-auto bg-[var(--theme-background)]"
  class:cursor-grab={isPanTool && !isPanning}
  class:cursor-grabbing={isPanning}
  class:cursor-copy={isAddTool}
  class:drag-over={isDragOver}
  style:cursor={canvasCursor}
  role="application"
  aria-label="Dashboard canvas"
  oncontextmenu={handleCanvasRightClick}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  data-canvas-background
  data-dashboard-canvas
>
  <div
    bind:this={canvasContentElement}
    class="canvas-content relative min-w-full min-h-full"
    data-dashboard-canvas-content
    style="width: max(100%, 1920px); height: max(100%, 1080px);"
  >
    {#if $widgetCount === 0}
      <div
        class="empty-state absolute inset-0 flex items-center justify-center p-8"
      >
        <div
          class="glass-panel-elevated empty-state-card max-w-md text-center p-10 rounded-2xl"
        >
          <div
            class="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-5 bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]"
            style="box-shadow: 0 0 24px rgba(var(--theme-primary-rgb), 0.3);"
          >
            <MousePointer2 size={32} />
          </div>
          <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-2">
            Your canvas is empty
          </h3>
          <p class="text-sm text-[var(--theme-text-muted)] mb-6">
            Use the <span class="font-medium text-[var(--theme-text)]">Add</span
            >
            tool or drag sensors from the sensor panel to start building your dashboard.
          </p>
          <div class="flex items-center justify-center gap-3 flex-wrap">
            <button
              class="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-background)] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
              onclick={() => onopenLeftSidebar?.()}
            >
              <Plus size={16} />
              Open Sensor Panel
            </button>
            <button
              class="px-4 py-2 border border-[var(--theme-primary)] text-[var(--theme-primary)] rounded-lg hover:bg-[var(--theme-primary)]/10 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
              onclick={() => onopenWizard?.()}
            >
              <Sparkles size={16} />
              Add Widget Wizard
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Widgets -->
    <div
      class="widget-layer"
      data-tool={currentTool}
      class:pointer-events-none={!widgetsInteractive}
    >
      {#each $widgetArray as widget (widget.id)}
        <WidgetContainer
          {widget}
          onwidgetUpdated={handleWidgetUpdated}
          onwidgetSelected={handleWidgetSelected}
          onwidgetContextMenu={handleWidgetContextMenu}
          onwidgetDelete={handleWidgetDelete}
        />
      {/each}
    </div>

    <!-- Snap guides -->
    <SnapGuides guides={$activeSnapGuides} />

    <!-- Selection rectangle (select tool only) -->
    {#if selectionRect && currentTool === "select"}
      <div
        class="selection-rectangle absolute border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)]/20 pointer-events-none rounded"
        style:left="{selectionRect.left}px"
        style:top="{selectionRect.top}px"
        style:width="{selectionRect.width}px"
        style:height="{selectionRect.height}px"
      ></div>
    {/if}

    <!-- Grid overlay (visible whenever grid is toggled on) -->
    {#if $visualSettings.show_grid}
      <div
        class="grid-overlay absolute inset-0 pointer-events-none opacity-40"
        style="--grid-size: {$visualSettings.grid_size}px"
      ></div>
    {/if}
  </div>
</div>

<style>
  .dashboard-canvas {
    position: relative;
    contain: layout style;
  }

  .dashboard-canvas:focus {
    outline: none;
  }

  .dashboard-canvas:focus-visible {
    outline: 2px solid var(--theme-primary);
    outline-offset: -2px;
  }

  .canvas-content {
    position: relative;
    background-image: radial-gradient(
      circle at 1px 1px,
      rgba(var(--theme-border-rgb), 0.12) 1px,
      transparent 0
    );
    background-size: 24px 24px;
  }

  .drag-over .canvas-content {
    background-color: rgba(var(--theme-primary-rgb), 0.06);
  }

  .empty-state {
    pointer-events: none;
  }

  .empty-state-card {
    pointer-events: auto;
  }

  .widget-layer {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }

  .widget-layer.pointer-events-none {
    pointer-events: none;
  }

  .selection-rectangle {
    backdrop-filter: blur(1px);
    animation: selection-pulse 1s ease-in-out infinite alternate;
  }

  .grid-overlay {
    background-image:
      linear-gradient(
        to right,
        rgba(var(--theme-border-rgb), 0.5) 1px,
        transparent 1px
      ),
      linear-gradient(
        to bottom,
        rgba(var(--theme-border-rgb), 0.5) 1px,
        transparent 1px
      );
    background-size: var(--grid-size) var(--grid-size);
  }

  .grid-overlay[style*="--grid-size: 1px"],
  .grid-overlay[style*="--grid-size: 2px"],
  .grid-overlay[style*="--grid-size: 3px"],
  .grid-overlay[style*="--grid-size: 4px"],
  .grid-overlay[style*="--grid-size: 5px"] {
    background-image: radial-gradient(
      circle,
      rgba(var(--theme-border-rgb), 0.5) 0.5px,
      transparent 0.5px
    );
  }

  .grid-overlay {
    will-change: background-size;
    contain: style layout;
  }

  @keyframes selection-pulse {
    0% {
      border-color: var(--theme-primary);
      background-color: rgba(var(--theme-primary-rgb), 0.1);
    }
    100% {
      border-color: var(--theme-secondary);
      background-color: rgba(var(--theme-primary-rgb), 0.15);
    }
  }
</style>
