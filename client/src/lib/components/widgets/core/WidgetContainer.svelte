<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { editMode, selectedWidgets, storeUtils } from '$lib/stores';
  import { configService } from '$lib/services/configService';
  import type { WidgetConfig } from '$lib/types';
  
  import WidgetContent from './WidgetContent.svelte';
  import WidgetControls from './WidgetControls.svelte';
  import ResizeHandles from './ResizeHandles.svelte';
  import WidgetBorder from './WidgetBorder.svelte';
  
  export let widget: WidgetConfig;
  
  const dispatch = createEventDispatcher<{
    'widget-updated': { id: string; updates: Partial<WidgetConfig> };
    'widget-selected': { id: string; multiSelect: boolean };
    'widget-context-menu': { id: string; x: number; y: number };
    'widget-delete': { id: string };
  }>();
  
  let containerElement: HTMLDivElement;
  let isDragging = false;
  let isResizing = false;
  let dragStart = { x: 0, y: 0 };
  let initialPos = { x: 0, y: 0 };
  let config = configService.getConfig();
  
  // Reactive state
  $: isSelected = $selectedWidgets.type === 'widget' && $selectedWidgets.ids.includes(widget.id);
  $: isLocked = widget.is_locked;
  $: showControls = $editMode === 'edit' && isSelected && !isLocked;
  $: canEdit = $editMode === 'edit';
  
  // Performance optimization
  let updateThrottle = 0;
  const throttleDelay = config.performance.widgetUpdateThrottle;
  
  onMount(() => {
    // Load configuration
    configService.loadConfig().then(loadedConfig => {
      config = loadedConfig;
    });
    
    return () => {
      // Cleanup
      if (updateThrottle) {
        clearTimeout(updateThrottle);
      }
    };
  });
  
  function handleContainerMouseDown(event: MouseEvent) {
    if (!canEdit || isLocked) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Select widget
    const multiSelect = event.shiftKey || event.ctrlKey;
    dispatch('widget-selected', { id: widget.id, multiSelect });
    
    // Start drag if not clicking on resize handle
    const target = event.target as HTMLElement;
    if (!target.closest('[data-resize-handle]')) {
      startDrag(event);
    }
  }
  
  function handleContainerClick(event: MouseEvent) {
    if (!canEdit) return;
    
    event.stopPropagation();
    const multiSelect = event.shiftKey || event.ctrlKey;
    dispatch('widget-selected', { id: widget.id, multiSelect });
  }
  
  function handleContextMenu(event: MouseEvent) {
    if (!canEdit) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    dispatch('widget-context-menu', {
      id: widget.id,
      x: event.clientX,
      y: event.clientY
    });
  }
  
  function startDrag(event: MouseEvent) {
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    initialPos = { x: widget.pos_x, y: widget.pos_y };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }
  
  function handleDragMove(event: MouseEvent) {
    if (!isDragging) return;
    
    // Throttle updates for performance
    if (updateThrottle) return;
    
    updateThrottle = setTimeout(() => {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      
      let newX = initialPos.x + deltaX;
      let newY = initialPos.y + deltaY;
      
      // Apply constraints
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      
      // Emit update
      dispatch('widget-updated', {
        id: widget.id,
        updates: { pos_x: newX, pos_y: newY }
      });
      
      updateThrottle = 0;
    }, throttleDelay);
  }
  
  function handleDragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }
  
  function handleResize(event: CustomEvent<{ width: number; height: number }>) {
    const { width, height } = event.detail;
    
    // Apply size constraints
    const minWidth = config.widgets.minWidgetWidth;
    const minHeight = config.widgets.minWidgetHeight;
    const maxWidth = config.widgets.maxWidgetWidth;
    const maxHeight = config.widgets.maxWidgetHeight;
    
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, height));
    
    dispatch('widget-updated', {
      id: widget.id,
      updates: { width: constrainedWidth, height: constrainedHeight }
    });
  }
  
  function handleLockToggle() {
    dispatch('widget-updated', {
      id: widget.id,
      updates: { is_locked: !widget.is_locked }
    });
  }
</script>

<div
  bind:this={containerElement}
  class="widget-container absolute cursor-pointer"
  class:widget-selected={isSelected}
  class:widget-locked={isLocked}
  class:widget-dragging={isDragging}
  class:widget-edit-mode={canEdit}
  style="
    left: {widget.pos_x}px;
    top: {widget.pos_y}px;
    width: {widget.width}px;
    height: {widget.height}px;
    z-index: {widget.z_index};
    transform: rotate({widget.rotation}deg);
  "
  on:mousedown={handleContainerMouseDown}
  on:click={handleContainerClick}
  on:contextmenu={handleContextMenu}
  role="button"
  tabindex="0"
>
  <!-- Widget Border and Selection Indicator -->
  <WidgetBorder {isSelected} {isLocked} {canEdit} />
  
  <!-- Widget Content -->
  <WidgetContent {widget} />
  
  <!-- Widget Controls (Edit Mode Only) -->
  {#if showControls}
    <WidgetControls 
      {widget}
      on:lock-toggle={handleLockToggle}
      on:delete={() => dispatch('widget-delete', { id: widget.id })}
    />
  {/if}
  
  <!-- Resize Handles (Edit Mode Only) -->
  {#if canEdit && !isLocked}
    <ResizeHandles 
      on:resize={handleResize}
    />
  {/if}
</div>

<style>
  .widget-container {
    transition: box-shadow 0.2s ease;
    will-change: transform;
  }
  
  .widget-container:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .widget-selected {
    box-shadow: 0 0 0 2px var(--theme-primary);
  }
  
  .widget-locked {
    opacity: 0.8;
  }
  
  .widget-dragging {
    user-select: none;
    pointer-events: none;
    z-index: 9999;
  }
  
  .widget-edit-mode {
    cursor: move;
  }
  
  .widget-edit-mode.widget-locked {
    cursor: not-allowed;
  }
</style> 