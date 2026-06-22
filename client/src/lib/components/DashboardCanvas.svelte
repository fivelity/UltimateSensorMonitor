<script lang="ts">
  import {
    widgetArray,
    editMode,
    selectedWidgets,
    visualSettings,
    storeUtils
  } from '$lib/stores';
  import WidgetShell from './WidgetShell.svelte';
  import type { Point } from '$lib/types';

  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  let canvasElement: HTMLDivElement | undefined = $state();
  let isDragging = $state(false);
  let isSelecting = $state(false);
  let selectionStart: Point = $state({ x: 0, y: 0 });
  let selectionEnd: Point = $state({ x: 0, y: 0 });

  $effect(() => {
    if (!canvasElement) return;

    // Handle canvas interactions
    const handleMouseDown = (event: MouseEvent) => {
      if ($editMode !== 'edit') return;

      const target = event.target as Element;

      // Only start selection if clicking on the canvas itself
      if (target === canvasElement || target.closest('[data-canvas-background]')) {
        startSelection(event);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isSelecting) {
        updateSelection(event);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isSelecting) {
        finishSelection(event);
      }
    };

    canvasElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvasElement?.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  function startSelection(event: MouseEvent) {
    if (!canvasElement) return;
    isSelecting = true;
    const rect = canvasElement.getBoundingClientRect();
    selectionStart = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    selectionEnd = { ...selectionStart };

    // Clear current selection unless holding Shift
    if (!event.shiftKey) {
      storeUtils.clearSelection();
    }
  }

  function updateSelection(event: MouseEvent) {
    if (!isSelecting || !canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    selectionEnd = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function finishSelection(event: MouseEvent) {
    if (!isSelecting) return;

    isSelecting = false;

    // Calculate selection rectangle
    const selRect: Rect = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y)
    };

    // Only select if there's a meaningful selection area
    if (selRect.width > 5 && selRect.height > 5) {
      // Find widgets that intersect with selection rectangle
      const selectedIds: string[] = [];

      $widgetArray.forEach(widget => {
        const widgetRect: Rect = {
          x: widget.pos_x,
          y: widget.pos_y,
          width: widget.width,
          height: widget.height
        };

        // Check if rectangles intersect
        if (rectanglesIntersect(selRect, widgetRect)) {
          selectedIds.push(widget.id);
        }
      });

      if (selectedIds.length > 0) {
        if (event.shiftKey) {
          // Add to existing selection
          const currentIds = $selectedWidgets.type === 'widget' ? $selectedWidgets.ids : [];
          const newIds = [...new Set([...currentIds, ...selectedIds])];
          selectedWidgets.set({ type: 'widget', ids: newIds });
        } else {
          // Replace selection
          selectedWidgets.set({ type: 'widget', ids: selectedIds });
        }
      }
    }
  }

  function rectanglesIntersect(rect1: Rect, rect2: Rect): boolean {
    return !(rect2.x > rect1.x + rect1.width ||
             rect2.x + rect2.width < rect1.x ||
             rect2.y > rect1.y + rect1.height ||
             rect2.y + rect2.height < rect1.y);
  }

  function handleCanvasRightClick(event: MouseEvent) {
    if ($editMode !== 'edit') return;

    event.preventDefault();
    storeUtils.showContextMenu(event.clientX, event.clientY, { type: 'canvas' });
  }

  // Get selection rectangle for display
  const selectionRect = $derived(isSelecting ? {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    width: Math.abs(selectionEnd.x - selectionStart.x),
    height: Math.abs(selectionEnd.y - selectionStart.y)
  } : null);
</script>

<div
  bind:this={canvasElement}
  class="w-full h-full relative overflow-auto bg-[var(--theme-background)] cursor-default"
  class:cursor-crosshair={$editMode === 'edit'}
  oncontextmenu={handleCanvasRightClick}
  data-canvas-background
>
  <!-- Canvas content area -->
  <div class="relative min-w-full min-h-full" style="width: max(100%, 1920px); height: max(100%, 1080px);">

    <!-- Widgets -->
    {#each $widgetArray as widget (widget.id)}
      <WidgetShell {widget} />
    {/each}

    <!-- Selection rectangle -->
    {#if selectionRect && $editMode === 'edit'}
      <div
        class="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none"
        style="
          left: {selectionRect.left}px;
          top: {selectionRect.top}px;
          width: {selectionRect.width}px;
          height: {selectionRect.height}px;
        "
      ></div>
    {/if}

    <!-- Grid overlay (dynamic size based on settings) -->
    {#if $editMode === 'edit' && $visualSettings.show_grid}
      <div
        class="absolute inset-0 pointer-events-none grid-pattern opacity-30"
        style="--grid-size: {$visualSettings.grid_size}px"
      ></div>
    {/if}
  </div>
</div>

<style>
  .grid-pattern {
    /* Use dots for smaller grids, lines for larger grids */
    background-image:
      linear-gradient(to right, var(--theme-border) 1px, transparent 1px),
      linear-gradient(to bottom, var(--theme-border) 1px, transparent 1px);
    background-size: var(--grid-size) var(--grid-size);
  }

  /* For very small grids, use dots instead of lines */
  .grid-pattern[style*="--grid-size: 1px"],
  .grid-pattern[style*="--grid-size: 2px"],
  .grid-pattern[style*="--grid-size: 3px"] {
    background-image: radial-gradient(circle, var(--theme-border) 0.5px, transparent 0.5px);
  }

  /* Performance optimizations */
  .grid-pattern {
    will-change: background-size;
    contain: style layout;
  }

  /* Optimize rendering for dragging operations */
  .dragging .grid-pattern {
    opacity: 0.15 !important;
    transition: opacity 0.1s ease;
  }
</style>
