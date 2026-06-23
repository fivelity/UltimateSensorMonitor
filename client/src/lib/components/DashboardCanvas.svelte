<script lang="ts">
  import { editMode, selectedWidgets, visualSettings } from "$lib/stores";
  import { uiUtils } from "$lib/stores/core/ui";
  import { widgetArray, widgetUtils } from "$lib/stores/data/widgets";
  import type { Bounds, Point, WidgetConfig } from "$lib/types";
  import WidgetContainer from "./widgets/core/WidgetContainer.svelte";

  interface SelectionRect {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  let canvasElement: HTMLDivElement | undefined = $state();
  let isSelecting = $state(false);
  let selectionStart = $state<Point>({ x: 0, y: 0 });
  let selectionEnd = $state<Point>({ x: 0, y: 0 });

  $effect(() => {
    if (!canvasElement) return;

    const handleMouseDown = (event: MouseEvent) => {
      if ($editMode !== "edit") return;

      const target = event.target as Element;

      // Only start selection if clicking on the canvas itself
      if (
        target === canvasElement ||
        target.closest("[data-canvas-background]")
      ) {
        startSelection(event);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isSelecting) updateSelection(event);
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isSelecting) finishSelection(event);
    };

    canvasElement.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvasElement?.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  function startSelection(event: MouseEvent) {
    if (!canvasElement) return;
    isSelecting = true;
    const rect = canvasElement.getBoundingClientRect();
    selectionStart = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
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
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
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

  // Selection rect for display
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
</script>

<div
  bind:this={canvasElement}
  class="dashboard-canvas w-full h-full relative overflow-auto bg-[var(--theme-background)] cursor-default"
  class:cursor-crosshair={$editMode === "edit"}
  role="application"
  aria-label="Dashboard canvas"
  tabindex="-1"
  oncontextmenu={handleCanvasRightClick}
  data-canvas-background
>
  <!-- Canvas content area -->
  <div
    class="canvas-content relative min-w-full min-h-full"
    style="width: max(100%, 1920px); height: max(100%, 1080px);"
  >
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

    <!-- Selection rectangle -->
    {#if selectionRect && $editMode === "edit"}
      <div
        class="selection-rectangle absolute border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)]/20 pointer-events-none rounded"
        style="
          left: {selectionRect.left}px;
          top: {selectionRect.top}px;
          width: {selectionRect.width}px;
          height: {selectionRect.height}px;
        "
      ></div>
    {/if}

    <!-- Grid overlay (dynamic size based on settings) -->
    {#if $editMode === "edit" && $visualSettings.show_grid}
      <div
        class="grid-overlay absolute inset-0 pointer-events-none opacity-30"
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

  .canvas-content {
    position: relative;
    background-image: radial-gradient(
      circle at 1px 1px,
      rgba(var(--theme-border-rgb), 0.15) 1px,
      transparent 0
    );
    background-size: 20px 20px;
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

  /* For very small grids, use dots instead of lines */
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

  /* Performance optimizations */
  .grid-overlay {
    will-change: background-size;
    contain: style layout;
  }

  /* Smooth selection animation */
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
