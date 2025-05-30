<script lang="ts">
  import { onMount } from 'svelte';
  import { editMode, selectedWidgets } from '$lib/stores/core/ui';
  import { visualSettings } from '$lib/stores/core/visual';
  import { widgetArray } from '$lib/stores/data/widgets';
  import { uiUtils } from '$lib/stores/core/ui';
  import { widgetUtils } from '$lib/stores/data/widgets';
  import WidgetContainer from './widgets/core/WidgetContainer.svelte';
  import type { Point } from '$lib/types';

  let canvasElement: HTMLDivElement;
  let isSelecting = false;
  let selectionStart: Point = { x: 0, y: 0 };
  let selectionEnd: Point = { x: 0, y: 0 };

  onMount(() => {
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
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  function startSelection(event: MouseEvent) {
    isSelecting = true;
    const rect = canvasElement.getBoundingClientRect();
    selectionStart = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    selectionEnd = { ...selectionStart };
    
    // Clear current selection unless holding Shift
    if (!event.shiftKey) {
      uiUtils.clearSelection();
    }
  }

  function updateSelection(event: MouseEvent) {
    if (!isSelecting) return;
    
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
    const selectionRect = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y)
    };

    // Only select if there's a meaningful selection area
    if (selectionRect.width > 5 && selectionRect.height > 5) {
      // Find widgets that intersect with selection rectangle
      const selectedIds: string[] = [];
      
      $widgetArray.forEach(widget => {
        const widgetRect = {
          x: widget.pos_x,
          y: widget.pos_y,
          width: widget.width,
          height: widget.height
        };
        
        // Check if rectangles intersect
        if (rectanglesIntersect(selectionRect, widgetRect)) {
          selectedIds.push(widget.id);
        }
      });
      
      if (selectedIds.length > 0) {
        if (event.shiftKey) {
          // Add to existing selection
          selectedIds.forEach(id => uiUtils.addToSelection(id));
        } else {
          // Replace selection
          selectedWidgets.set({ type: 'widget', ids: selectedIds });
        }
      }
    }
  }

  function rectanglesIntersect(rect1: any, rect2: any): boolean {
    return !(rect2.x > rect1.x + rect1.width || 
             rect2.x + rect2.width < rect1.x || 
             rect2.y > rect1.y + rect1.height ||
             rect2.y + rect2.height < rect1.y);
  }

  function handleCanvasRightClick(event: MouseEvent) {
    if ($editMode !== 'edit') return;
    
    event.preventDefault();
    uiUtils.showContextMenu(event.clientX, event.clientY, { type: 'canvas' });
  }

  // Handle widget events
  function handleWidgetUpdated(event: CustomEvent<{ id: string; updates: Partial<any> }>) {
    const { id, updates } = event.detail;
    widgetUtils.updateWidget(id, updates);
  }

  function handleWidgetSelected(event: CustomEvent<{ id: string; multiSelect: boolean }>) {
    const { id, multiSelect } = event.detail;
    uiUtils.selectWidget(id, multiSelect);
  }

  function handleWidgetContextMenu(event: CustomEvent<{ id: string; x: number; y: number }>) {
    const { id, x, y } = event.detail;
    uiUtils.showContextMenu(x, y, { type: 'widget', id });
  }

  function handleWidgetDelete(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail;
    widgetUtils.removeWidget(id);
  }

  // Get selection rectangle for display
  $: selectionRect = isSelecting ? {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    width: Math.abs(selectionEnd.x - selectionStart.x),
    height: Math.abs(selectionEnd.y - selectionStart.y)
  } : null;
</script>

<div 
  bind:this={canvasElement}
  class="dashboard-canvas w-full h-full relative overflow-auto bg-[var(--theme-background)] cursor-default"
  class:cursor-crosshair={$editMode === 'edit'}
  on:contextmenu={handleCanvasRightClick}
  data-canvas-background
>
  <!-- Canvas content area -->
  <div class="canvas-content relative min-w-full min-h-full" style="width: max(100%, 1920px); height: max(100%, 1080px);">
    
    <!-- Widgets -->
    {#each $widgetArray as widget (widget.id)}
      <WidgetContainer 
        {widget}
        on:widget-updated={handleWidgetUpdated}
        on:widget-selected={handleWidgetSelected}
        on:widget-context-menu={handleWidgetContextMenu}
        on:widget-delete={handleWidgetDelete}
      />
    {/each}

    <!-- Selection rectangle -->
    {#if selectionRect && $editMode === 'edit'}
      <div 
        class="selection-rectangle absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none rounded"
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
    background-image: 
      radial-gradient(circle at 1px 1px, rgba(var(--theme-border-rgb), 0.15) 1px, transparent 0);
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
    background-image: radial-gradient(circle, var(--theme-border) 0.5px, transparent 0.5px);
  }

  /* Performance optimizations */
  .grid-overlay {
    will-change: background-size;
    contain: style layout;
  }

  /* Smooth selection animation */
  @keyframes selection-pulse {
    0% {
      border-color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
    }
    100% {
      border-color: #60a5fa;
      background-color: rgba(96, 165, 250, 0.15);
    }
  }

  /* Optimize rendering during selection */
  .dashboard-canvas:has(.selection-rectangle) .canvas-content {
    will-change: scroll-position;
  }

  /* Dark mode adjustments */
  :global(.dark) .canvas-content {
    background-image: 
      radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  }
</style> 