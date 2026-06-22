<script lang="ts">
  import { 
    editMode, 
    selectedWidgets, 
    sensorData, 
    visualSettings,
    storeUtils
  } from '$lib/stores';
  import type { WidgetConfig, SensorData, Point, ResizeHandle } from '$lib/types';
  import TextGauge from './gauges/TextGauge.svelte';
  import RadialGauge from './gauges/RadialGauge.svelte';
  import LinearGauge from './gauges/LinearGauge.svelte';
  import GraphGauge from './gauges/GraphGauge.svelte';
  import ImageSequenceGauge from './gauges/ImageSequenceGauge.svelte';
  import GlassmorphicGauge from './gauges/GlassmorphicGauge.svelte';
  import { Lock, Unlock } from '@lucide/svelte';

  interface Props {
    widget: WidgetConfig;
  }

  const { widget }: Props = $props();

  let widgetElement = $state<HTMLDivElement | undefined>(undefined);
  let isDragging = $state(false);
  let isResizing = $state(false);
  let resizeHandle = $state<ResizeHandle | ''>('');
  let dragStart = $state<Point>({ x: 0, y: 0 });
  let initialPos = $state<Point>({ x: 0, y: 0 });
  let rafId = $state<number | null>(null); // For requestAnimationFrame optimization

  // Performance optimization: throttle updates
  let lastUpdateTime = $state(0);
  const UPDATE_THRESHOLD = 16; // ~60fps

  // Get current sensor data for this widget
  const currentSensorData = $derived($sensorData[widget.sensor_id] as SensorData | undefined);

  $effect(() => {
    console.log(`[WidgetShell ${widget.id}] Sensor ID: ${widget.sensor_id}, Current Data:`, currentSensorData);
  });
  
  // Check if widget is selected
  const isSelected = $derived($selectedWidgets.type === 'widget' && $selectedWidgets.ids.includes(widget.id));
  
  // Check if widget is locked
  const isLocked = $derived(widget.is_locked);
  
  // Show controls when in edit mode and widget is selected
  const showControls = $derived($editMode === 'edit' && isSelected);

  $effect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (isDragging) {
        handleDrag(event);
      } else if (isResizing) {
        handleResize(event);
      }
    }

    function handleMouseUp() {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        
        // Clean up performance optimizations
        document.body.classList.remove('dragging');
        
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Cleanup on component destruction
      document.body.classList.remove('dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  });

  function handleWidgetMouseDown(event: MouseEvent) {
    if ($editMode !== 'edit' || isLocked) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Select widget first
    storeUtils.selectWidget(widget.id, event.shiftKey || event.ctrlKey);
    
    // Only start dragging if clicking on the widget content (not resize handles)
    const target = event.target as HTMLElement;
    if (!target.closest('.resize-handle')) {
      startDrag(event);
    }
  }

  function startDrag(event: MouseEvent) {
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    initialPos = { x: widget.pos_x, y: widget.pos_y };
    
    // Add dragging class to canvas for performance optimization
    document.body.classList.add('dragging');
  }

  function handleDrag(event: MouseEvent) {
    if (!isDragging) return;

    // Throttle updates for better performance
    const now = performance.now();
    if (now - lastUpdateTime < UPDATE_THRESHOLD) return;
    lastUpdateTime = now;

    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      
      let newX = initialPos.x + deltaX;
      let newY = initialPos.y + deltaY;

      // Snap to grid if enabled
      if ($visualSettings.snap_to_grid) {
        const gridSize = $visualSettings.grid_size;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      // Ensure widget stays within canvas bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      storeUtils.updateWidget(widget.id, {
        pos_x: newX,
        pos_y: newY
      });
      
      rafId = null;
    });
  }

  function startResize(event: MouseEvent, handle: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();
    
    isResizing = true;
    resizeHandle = handle;
    dragStart = { x: event.clientX, y: event.clientY };
    
    // Add resizing class for performance optimization
    document.body.classList.add('dragging');
  }

  function handleResize(event: MouseEvent) {
    if (!isResizing) return;

    // Throttle updates for better performance
    const now = performance.now();
    if (now - lastUpdateTime < UPDATE_THRESHOLD) return;
    lastUpdateTime = now;

    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      
      let newWidth = widget.width;
      let newHeight = widget.height;
      let newX = widget.pos_x;
      let newY = widget.pos_y;

      // Handle different resize directions
      switch (resizeHandle) {
        case 'se': // Southeast (bottom-right)
          newWidth += deltaX;
          newHeight += deltaY;
          break;
        case 'sw': // Southwest (bottom-left)
          newWidth -= deltaX;
          newHeight += deltaY;
          newX += deltaX;
          break;
        case 'ne': // Northeast (top-right)
          newWidth += deltaX;
          newHeight -= deltaY;
          newY += deltaY;
          break;
        case 'nw': // Northwest (top-left)
          newWidth -= deltaX;
          newHeight -= deltaY;
          newX += deltaX;
          newY += deltaY;
          break;
        case 'e': // East (right)
          newWidth += deltaX;
          break;
        case 'w': // West (left)
          newWidth -= deltaX;
          newX += deltaX;
          break;
        case 'n': // North (top)
          newHeight -= deltaY;
          newY += deltaY;
          break;
        case 's': // South (bottom)
          newHeight += deltaY;
          break;
      }

      // Minimum size constraints
      const minWidth = 50;
      const minHeight = 30;
      
      if (newWidth < minWidth) {
        newWidth = minWidth;
        if (resizeHandle.includes('w')) {
          newX = widget.pos_x + widget.width - minWidth;
        }
      }
      
      if (newHeight < minHeight) {
        newHeight = minHeight;
        if (resizeHandle.includes('n')) {
          newY = widget.pos_y + widget.height - minHeight;
        }
      }

      // Snap to grid if enabled
      if ($visualSettings.snap_to_grid) {
        const gridSize = $visualSettings.grid_size;
        newWidth = Math.round(newWidth / gridSize) * gridSize;
        newHeight = Math.round(newHeight / gridSize) * gridSize;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      storeUtils.updateWidget(widget.id, {
        width: newWidth,
        height: newHeight,
        pos_x: newX,
        pos_y: newY
      });

      // Update drag start for continuous resizing
      dragStart = { x: event.clientX, y: event.clientY };
      rafId = null;
    });
  }

  function handleWidgetRightClick(event: MouseEvent) {
    if ($editMode !== 'edit') return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (!isSelected) {
      storeUtils.selectWidget(widget.id);
    }
    
    storeUtils.showContextMenu(event.clientX, event.clientY, { 
      type: 'widget', 
      id: widget.id 
    });
  }

  function toggleLock() {
    storeUtils.updateWidget(widget.id, {
      is_locked: !widget.is_locked
    });
  }

  function deleteWidget() {
    storeUtils.removeWidget(widget.id);
  }

  // Get the appropriate gauge component based on widget type
  function getGaugeComponent(gaugeType: WidgetConfig['gauge_type']) {
    switch (gaugeType) {
      case 'radial':
        return RadialGauge;
      case 'linear':
        return LinearGauge;
      case 'graph':
        return GraphGauge;
      case 'image':
        return ImageSequenceGauge;
      case 'glassmorphic':
        return GlassmorphicGauge;
      case 'text':
      default:
        return TextGauge;
    }
  }
</script>

<div
  bind:this={widgetElement}
  class="absolute widget-shell transition-all duration-200"
  class:selected={isSelected}
  class:locked={isLocked}
  class:dragging={isDragging}
  class:resizing={isResizing}
  style="
    left: {widget.pos_x}px;
    top: {widget.pos_y}px;
    width: {widget.width}px;
    height: {widget.height}px;
    z-index: {widget.z_index + (isSelected ? 1000 : 0)};
    transform: rotate({widget.rotation}deg);
  "
  onmousedown={handleWidgetMouseDown}
  oncontextmenu={handleWidgetRightClick}
  role="button"
  tabindex="0"
>
  <!-- Widget Content -->
  <div class="w-full h-full p-3 flex flex-col">
    
    <!-- Gauge Component -->
    <div class="flex-1 min-h-0">
      <svelte:component 
        this={getGaugeComponent(widget.gauge_type)}
        {widget}
        sensorData={currentSensorData}
      />
    </div>

    <!-- Sensor Label and Value (if enabled) -->
    {#if widget.show_label || widget.show_unit}
      <div class="text-xs text-[var(--theme-text-muted)] mt-2 truncate">
        {#if widget.show_label}
          <div class="font-medium">
            {widget.custom_label || currentSensorData?.name || 'Unknown Sensor'}
          </div>
        {/if}
        {#if widget.show_unit && currentSensorData}
          <div class="opacity-75">
            {widget.custom_unit || currentSensorData.unit}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Edit Mode Controls -->
  {#if showControls}
    <!-- Selection Border -->
    <div class="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded"></div>
    
    <!-- Lock/Unlock Button -->
    <button
      class="absolute -top-8 -right-8 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition-colors"
      onclick={(event) => { event.stopPropagation(); toggleLock(); }}
      title={isLocked ? 'Unlock widget' : 'Lock widget'}
    >
      {#if isLocked}
        <Lock size={12} />
      {:else}
        <Unlock size={12} />
      {/if}
    </button>

    <!-- Resize Handles (only when not locked) -->
    {#if !isLocked}
      <!-- Corner handles -->
      <div 
        class="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'nw'); }}
      ></div>
      <div 
        class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'ne'); }}
      ></div>
      <div 
        class="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'sw'); }}
      ></div>
      <div 
        class="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'se'); }}
      ></div>
      
      <!-- Edge handles -->
      <div 
        class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 cursor-n-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'n'); }}
      ></div>
      <div 
        class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 cursor-s-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 's'); }}
      ></div>
      <div 
        class="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 cursor-w-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'w'); }}
      ></div>
      <div 
        class="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 cursor-e-resize resize-handle" 
        onmousedown={(event) => { event.stopPropagation(); startResize(event, 'e'); }}
      ></div>
    {/if}
  {/if}

  <!-- Lock indicator when widget is locked -->
  {#if isLocked && $editMode === 'edit'}
    <div class="absolute top-1 right-1 text-yellow-500">
      <Lock size={12} />
    </div>
  {/if}
</div>

<style>
  .widget-shell {
    user-select: none;
  }

  .widget-shell.selected {
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
  }

  .widget-shell.dragging {
    cursor: grabbing;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  }

  .widget-shell.locked {
    opacity: 0.8;
  }

  .widget-shell:hover {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
  }
</style>
