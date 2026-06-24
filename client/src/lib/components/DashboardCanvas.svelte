<script lang="ts">
  import {
    activeSnapGuides,
    dashboardInteraction,
    editMode,
    handleKeyboardShortcut,
    selectedWidgets,
    visualSettings,
    visualUtils,
    widgetArray,
    widgetCount,
    widgetUtils,
  } from "$lib/stores";
  import { uiUtils } from "$lib/stores/core/ui";
  import { AddWidgetCommand, historyStore } from "$lib/stores/history";
  import type { Bounds, GaugeType, Point, WidgetConfig } from "$lib/types";
  import { snapToGrid } from "$lib/utils/geometry";
  import { logger } from "$lib/utils/logger";
  import {
    Grid3X3,
    Magnet,
    MousePointer2,
    Plus,
    RotateCcw,
    RotateCw,
    Sparkles,
  } from "@lucide/svelte";
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

  $effect(() => {
    if (!canvasElement) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (get(dashboardInteraction).mode === "dragging") return;

      const target = event.target as Element;
      if (
        target === canvasElement ||
        target === canvasContentElement ||
        target.closest("[data-canvas-background]")
      ) {
        if ($editMode !== "edit") {
          uiUtils.clearSelection();
          return;
        }
        startSelection(event);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isSelecting) updateSelection(event);
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isSelecting) finishSelection(event);
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

  function handleCanvasRightClick(event: MouseEvent) {
    if ($editMode !== "edit") return;
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
    if ($editMode !== "edit") return;
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
    if ($editMode !== "edit" || !canvasContentElement) return;
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

  function toggleEditMode() {
    editMode.update((mode) => (mode === "edit" ? "view" : "edit"));
  }

  function handleUndo() {
    historyStore.undo();
  }

  function handleRedo() {
    historyStore.redo();
  }

  function handleGridSizeChange(newSize: number) {
    visualUtils.setGridSize(newSize);
  }

  export function scrollToBounds(bounds: Bounds) {
    if (!canvasElement) return;

    const padding = 40;
    const targetLeft = Math.max(0, bounds.x - padding);
    const targetTop = Math.max(0, bounds.y - padding);
    const targetRight = bounds.x + bounds.width + padding;
    const targetBottom = bounds.y + bounds.height + padding;

    // Only scroll if the target is outside the current viewport
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

  const canUndo = $derived($historyStore?.currentIndex >= 0);
  const canRedo = $derived(
    $historyStore?.currentIndex < $historyStore?.commands.length - 1,
  );
</script>

<div
  bind:this={canvasElement}
  class="dashboard-canvas w-full h-full relative overflow-auto bg-[var(--theme-background)] cursor-default"
  class:cursor-crosshair={$editMode === "edit"}
  class:drag-over={isDragOver}
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
          class="empty-state-card max-w-md text-center p-8 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg"
        >
          <MousePointer2
            size={48}
            class="mx-auto mb-4 text-[var(--theme-primary)]"
          />
          <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-2">
            No widgets yet
          </h3>
          <p class="text-sm text-[var(--theme-text-muted)] mb-6">
            {#if $editMode === "edit"}
              Drag sensors from the sidebar onto the canvas, or add your first
              widget from the sensor list.
            {:else}
              Switch to Edit mode to add sensors and build your dashboard.
            {/if}
          </p>
          <div class="flex items-center justify-center gap-3 flex-wrap">
            {#if $editMode === "edit"}
              <button
                class="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-background)] rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
                onclick={() => onopenLeftSidebar?.()}
              >
                <Plus size={16} />
                Open Sensor List
              </button>
              <button
                class="px-4 py-2 border border-[var(--theme-primary)] text-[var(--theme-primary)] rounded-md hover:bg-[var(--theme-primary)]/10 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
                onclick={() => onopenWizard?.()}
              >
                <Sparkles size={16} />
                Add Widget Wizard
              </button>
            {:else}
              <button
                class="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-background)] rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
                onclick={toggleEditMode}
              >
                Switch to Edit Mode
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Widgets -->
    {#each $widgetArray as widget (widget.id)}
      <WidgetContainer
        {widget}
        onwidgetUpdated={handleWidgetUpdated}
        onwidgetSelected={handleWidgetSelected}
        onwidgetContextMenu={handleWidgetContextMenu}
        onwidgetDelete={handleWidgetDelete}
      />
    {/each}

    <!-- Snap guides -->
    <SnapGuides guides={$activeSnapGuides} />

    <!-- Selection rectangle -->
    {#if selectionRect && $editMode === "edit"}
      <div
        class="selection-rectangle absolute border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)]/20 pointer-events-none rounded"
        style=""
        style:left="{selectionRect.left}px"
        style:top="{selectionRect.top}px"
        style:width="{selectionRect.width}px"
        style:height="{selectionRect.height}px"
      ></div>
    {/if}

    <!-- Grid overlay -->
    {#if $editMode === "edit" && $visualSettings.show_grid}
      <div
        class="grid-overlay absolute inset-0 pointer-events-none opacity-30"
        style="--grid-size: {$visualSettings.grid_size}px"
      ></div>
    {/if}

    <!-- Floating canvas toolbar -->
    {#if $editMode === "edit"}
      <div
        class="canvas-toolbar absolute bottom-4 right-4 flex items-center gap-1 p-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg"
      >
        <button
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          class:text-[var(--theme-primary)]={$visualSettings.show_grid}
          onclick={() => visualUtils.toggleGrid()}
          title={$visualSettings.show_grid ? "Hide grid" : "Show grid"}
          aria-label={$visualSettings.show_grid ? "Hide grid" : "Show grid"}
        >
          <Grid3X3 size={16} />
        </button>

        <button
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          class:text-[var(--theme-primary)]={$visualSettings.snap_to_grid}
          onclick={() => visualUtils.toggleSnap()}
          title={$visualSettings.snap_to_grid ? "Disable snap" : "Enable snap"}
          aria-label={$visualSettings.snap_to_grid
            ? "Disable snap"
            : "Enable snap"}
        >
          <Magnet size={16} />
        </button>

        <div class="h-6 w-px bg-[var(--theme-border)] mx-1"></div>

        <select
          class="h-8 px-2 text-xs bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]"
          value={$visualSettings.grid_size}
          onchange={(e) =>
            handleGridSizeChange(parseInt(e.currentTarget.value))}
          title="Grid size"
          aria-label="Grid size"
        >
          <option value={1}>1px</option>
          <option value={5}>5px</option>
          <option value={10}>10px</option>
          <option value={20}>20px</option>
          <option value={50}>50px</option>
        </select>

        <div class="h-6 w-px bg-[var(--theme-border)] mx-1"></div>

        <button
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-40"
          disabled={!canUndo}
          onclick={handleUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <RotateCcw size={16} />
        </button>

        <button
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-40"
          disabled={!canRedo}
          onclick={handleRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RotateCw size={16} />
        </button>
      </div>
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
      rgba(var(--theme-border-rgb), 0.15) 1px,
      transparent 0
    );
    background-size: 20px 20px;
  }

  .drag-over .canvas-content {
    background-color: rgba(var(--theme-primary-rgb), 0.05);
  }

  .empty-state {
    pointer-events: none;
  }

  .empty-state-card {
    pointer-events: auto;
  }

  .selection-rectangle {
    backdrop-filter: blur(1px);
    animation: selection-pulse 1s ease-in-out infinite alternate;
  }

  .grid-overlay {
    background-image:
      linear-gradient(to right, var(--theme-border) 1px, transparent 1px),
      linear-gradient(to bottom, var(--theme-border) 1px, transparent 1px);
    background-size: var(--grid-size) var(--grid-size);
  }

  .grid-overlay[style*="--grid-size: 1px"],
  .grid-overlay[style*="--grid-size: 2px"],
  .grid-overlay[style*="--grid-size: 3px"],
  .grid-overlay[style*="--grid-size: 4px"],
  .grid-overlay[style*="--grid-size: 5px"] {
    background-image: radial-gradient(
      circle,
      var(--theme-border) 0.5px,
      transparent 0.5px
    );
  }

  .grid-overlay {
    will-change: background-size;
    contain: style layout;
  }

  .canvas-toolbar {
    z-index: 1000;
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
