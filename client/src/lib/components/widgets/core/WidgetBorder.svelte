<script lang="ts">
  const { isSelected = false, isLocked = false, canEdit = false }: {
    isSelected?: boolean;
    isLocked?: boolean;
    canEdit?: boolean;
  } = $props();

  // Reactive classes for different states
  const borderClass = $derived(getBorderClass(isSelected, isLocked, canEdit));

  function getBorderClass(selected: boolean, locked: boolean, editMode: boolean): string {
    const classes = ['widget-border'];

    if (selected && editMode) {
      classes.push('border-selected');
    } else if (editMode) {
      classes.push('border-edit-mode');
    } else {
      classes.push('border-view-mode');
    }

    if (locked) {
      classes.push('border-locked');
    }

    return classes.join(' ');
  }
</script>

<div class={borderClass}>
  <!-- Selection indicator -->
  {#if isSelected && canEdit}
    <div class="selection-indicator"></div>
  {/if}

  <!-- Lock indicator -->
  {#if isLocked}
    <div class="lock-indicator">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
      </svg>
    </div>
  {/if}
</div>

<style>
  .widget-border {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  /* View mode - subtle border */
  .border-view-mode {
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.02);
  }

  .border-view-mode:hover {
    border-color: rgba(var(--theme-border-rgb), 0.3);
    background: rgba(255, 255, 255, 0.05);
  }

  /* Edit mode - visible border */
  .border-edit-mode {
    border: 1px solid rgba(var(--theme-border-rgb), 0.4);
    background: rgba(255, 255, 255, 0.03);
  }

  .border-edit-mode:hover {
    border-color: rgba(var(--theme-border-rgb), 0.6);
    background: rgba(255, 255, 255, 0.08);
  }

  /* Selected state */
  .border-selected {
    border: 2px solid var(--theme-primary);
    background: rgba(var(--theme-primary-rgb), 0.05);
    box-shadow:
      0 0 0 1px rgba(var(--theme-primary-rgb), 0.2),
      0 2px 8px rgba(var(--theme-primary-rgb), 0.15);
  }

  /* Locked state */
  .border-locked {
    border-style: dashed;
    opacity: 0.8;
  }

  .border-locked.border-selected {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
    box-shadow:
      0 0 0 1px rgba(245, 158, 11, 0.2),
      0 2px 8px rgba(245, 158, 11, 0.15);
  }

  /* Selection indicator */
  .selection-indicator {
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border: 2px solid var(--theme-primary);
    border-radius: 8px;
    opacity: 0.6;
    animation: pulse-selection 2s infinite;
  }

  /* Lock indicator */
  .lock-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background: rgba(245, 158, 11, 0.9);
    color: white;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    backdrop-filter: blur(4px);
    z-index: 10;
  }

  /* Animations */
  @keyframes pulse-selection {
    0%, 100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.02);
    }
  }

  /* Dark mode adjustments */
  :global(.dark) .border-view-mode {
    background: rgba(255, 255, 255, 0.01);
  }

  :global(.dark) .border-view-mode:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  :global(.dark) .border-edit-mode {
    background: rgba(255, 255, 255, 0.02);
  }

  :global(.dark) .border-edit-mode:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  /* Performance optimizations */
  .widget-border {
    will-change: border-color, background, box-shadow;
    contain: layout style;
  }

  .selection-indicator {
    will-change: opacity, transform;
  }
</style>
