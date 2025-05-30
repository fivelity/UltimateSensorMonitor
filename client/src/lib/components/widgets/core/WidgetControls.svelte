<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Lock, Unlock, X, Settings, Copy, RotateCw, Move3D } from 'lucide-svelte';
  import type { WidgetConfig } from '$lib/types';
  
  export let widget: WidgetConfig;
  
  const dispatch = createEventDispatcher<{
    'lock-toggle': void;
    'delete': void;
    'duplicate': void;
    'rotate': void;
    'settings': void;
    'bring-to-front': void;
    'send-to-back': void;
  }>();
  
  $: isLocked = widget.is_locked;
  
  function handleLockToggle(event: MouseEvent) {
    event.stopPropagation();
    dispatch('lock-toggle');
  }
  
  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    dispatch('delete');
  }
  
  function handleDuplicate(event: MouseEvent) {
    event.stopPropagation();
    dispatch('duplicate');
  }
  
  function handleRotate(event: MouseEvent) {
    event.stopPropagation();
    dispatch('rotate');
  }
  
  function handleSettings(event: MouseEvent) {
    event.stopPropagation();
    dispatch('settings');
  }
  
  function handleBringToFront(event: MouseEvent) {
    event.stopPropagation();
    dispatch('bring-to-front');
  }
  
  function handleSendToBack(event: MouseEvent) {
    event.stopPropagation();
    dispatch('send-to-back');
  }
</script>

<div class="widget-controls absolute -top-8 left-0 flex items-center gap-1">
  <!-- Primary Controls Bar -->
  <div class="controls-bar flex items-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-sm px-1 py-1">
    <!-- Lock/Unlock Toggle -->
    <button
      class="control-button"
      class:control-active={isLocked}
      title={isLocked ? 'Unlock widget' : 'Lock widget'}
      on:click={handleLockToggle}
    >
      {#if isLocked}
        <Lock size={14} />
      {:else}
        <Unlock size={14} />
      {/if}
    </button>
    
    <!-- Settings -->
    <button
      class="control-button"
      title="Widget settings"
      on:click={handleSettings}
    >
      <Settings size={14} />
    </button>
    
    <!-- Duplicate -->
    <button
      class="control-button"
      title="Duplicate widget"
      on:click={handleDuplicate}
    >
      <Copy size={14} />
    </button>
    
    <!-- Rotate -->
    <button
      class="control-button"
      title="Rotate widget"
      on:click={handleRotate}
    >
      <RotateCw size={14} />
    </button>
    
    <!-- Divider -->
    <div class="control-divider"></div>
    
    <!-- Layer Controls -->
    <button
      class="control-button text-xs"
      title="Bring to front"
      on:click={handleBringToFront}
    >
      ↑
    </button>
    
    <button
      class="control-button text-xs"
      title="Send to back"
      on:click={handleSendToBack}
    >
      ↓
    </button>
    
    <!-- Divider -->
    <div class="control-divider"></div>
    
    <!-- Delete -->
    <button
      class="control-button control-danger"
      title="Delete widget"
      on:click={handleDelete}
    >
      <X size={14} />
    </button>
  </div>
  
  <!-- Widget Info Badge -->
  <div class="widget-info-badge bg-gray-800/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
    {widget.width}×{widget.height}
  </div>
</div>

<style>
  .widget-controls {
    pointer-events: auto;
    z-index: 1000;
  }
  
  .controls-bar {
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 11px;
    font-weight: 500;
  }
  
  .control-button:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .control-button:active {
    transform: scale(0.95);
  }
  
  .control-active {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .control-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
  
  .control-divider {
    width: 1px;
    height: 16px;
    background: #e5e7eb;
    margin: 0 2px;
  }
  
  .widget-info-badge {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    white-space: nowrap;
    pointer-events: none;
  }
  
  /* Dark mode adjustments */
  :global(.dark) .controls-bar {
    background: rgba(31, 41, 55, 0.9);
    border-color: rgba(75, 85, 99, 0.3);
  }
  
  :global(.dark) .control-button {
    color: #9ca3af;
  }
  
  :global(.dark) .control-button:hover {
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.15);
  }
  
  :global(.dark) .control-divider {
    background: #4b5563;
  }
</style> 