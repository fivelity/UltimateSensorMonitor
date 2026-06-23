<script lang="ts">
  import type { WidgetConfig } from "$lib/types";
  import { Copy, Lock, RotateCw, Settings, Unlock, X } from "@lucide/svelte";

  const {
    widget,
    onlockToggle,
    ondelete,
    onduplicate,
    onrotate,
    onsettings,
    onbringToFront,
    onsendToBack,
  }: {
    widget: WidgetConfig;
    onlockToggle?: () => void;
    ondelete?: () => void;
    onduplicate?: () => void;
    onrotate?: () => void;
    onsettings?: () => void;
    onbringToFront?: () => void;
    onsendToBack?: () => void;
  } = $props();

  const isLocked = $derived(widget.is_locked);

  function handleLockToggle(event: MouseEvent) {
    event.stopPropagation();
    onlockToggle?.();
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    ondelete?.();
  }

  function handleDuplicate(event: MouseEvent) {
    event.stopPropagation();
    onduplicate?.();
  }

  function handleRotate(event: MouseEvent) {
    event.stopPropagation();
    onrotate?.();
  }

  function handleSettings(event: MouseEvent) {
    event.stopPropagation();
    onsettings?.();
  }

  function handleBringToFront(event: MouseEvent) {
    event.stopPropagation();
    onbringToFront?.();
  }

  function handleSendToBack(event: MouseEvent) {
    event.stopPropagation();
    onsendToBack?.();
  }
</script>

<div class="widget-controls absolute -top-8 left-0 flex items-center gap-1">
  <!-- Primary Controls Bar -->
  <div
    class="controls-bar flex items-center bg-[var(--theme-surface-glass)] backdrop-blur-[var(--theme-backdrop-blur)] border border-[var(--theme-border)] rounded-md shadow-sm px-1 py-1"
  >
    <!-- Lock/Unlock Toggle -->
    <button
      class="control-button"
      class:control-active={isLocked}
      title={isLocked ? "Unlock widget" : "Lock widget"}
      aria-label={isLocked ? "Unlock widget" : "Lock widget"}
      onclick={handleLockToggle}
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
      aria-label="Widget settings"
      onclick={handleSettings}
    >
      <Settings size={14} />
    </button>

    <!-- Duplicate -->
    <button
      class="control-button"
      title="Duplicate widget"
      aria-label="Duplicate widget"
      onclick={handleDuplicate}
    >
      <Copy size={14} />
    </button>

    <!-- Rotate -->
    <button
      class="control-button"
      title="Rotate widget"
      aria-label="Rotate widget"
      onclick={handleRotate}
    >
      <RotateCw size={14} />
    </button>

    <!-- Divider -->
    <div class="control-divider"></div>

    <!-- Layer Controls -->
    <button
      class="control-button text-xs"
      title="Bring to front"
      aria-label="Bring to front"
      onclick={handleBringToFront}
    >
      ↑
    </button>

    <button
      class="control-button text-xs"
      title="Send to back"
      aria-label="Send to back"
      onclick={handleSendToBack}
    >
      ↓
    </button>

    <!-- Divider -->
    <div class="control-divider"></div>

    <!-- Delete -->
    <button
      class="control-button control-danger"
      title="Delete widget"
      aria-label="Delete widget"
      onclick={handleDelete}
    >
      <X size={14} />
    </button>
  </div>

  <!-- Widget Info Badge -->
  <div
    class="widget-info-badge bg-[var(--theme-surface)] text-[var(--theme-text)] text-xs px-2 py-1 rounded-md border border-[var(--theme-border)] backdrop-blur-sm"
  >
    {widget.width}×{widget.height}
  </div>
</div>

<style>
  .widget-controls {
    pointer-events: auto;
    z-index: 1000;
  }

  .controls-bar {
    box-shadow: 0 2px 8px rgba(0, 0, 0, var(--theme-elevation-opacity));
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--theme-text-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 11px;
    font-weight: 500;
  }

  .control-button:hover {
    background: rgba(var(--theme-primary-rgb), 0.1);
    color: var(--theme-primary);
  }

  .control-button:active {
    transform: scale(0.95);
  }

  .control-active {
    background: rgba(var(--theme-primary-rgb), 0.1);
    color: var(--theme-primary);
  }

  .control-danger:hover {
    background: rgba(var(--theme-danger-rgb), 0.1);
    color: var(--theme-danger);
  }

  .control-divider {
    width: 1px;
    height: 16px;
    background: var(--theme-border);
    margin: 0 2px;
  }

  .widget-info-badge {
    font-family: var(--font-family), monospace;
    white-space: nowrap;
    pointer-events: none;
  }

  /* Accessibility */
  .control-button:focus {
    outline: 2px solid var(--theme-primary);
    outline-offset: 1px;
  }

  /* Performance optimizations */
  .control-button {
    will-change: color, background;
  }
</style>
