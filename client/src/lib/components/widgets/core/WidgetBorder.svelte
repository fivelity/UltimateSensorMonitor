<script lang="ts">
  import { Lock } from "@lucide/svelte";

  const {
    isSelected = false,
    isLocked = false,
    canEdit = false,
  }: {
    isSelected?: boolean;
    isLocked?: boolean;
    canEdit?: boolean;
  } = $props();

  // Reactive classes for different states
  const borderClass = $derived(getBorderClass(isSelected, isLocked, canEdit));

  function getBorderClass(
    selected: boolean,
    locked: boolean,
    editMode: boolean,
  ): string {
    const classes = ["widget-border"];

    if (selected && editMode) {
      classes.push("border-selected");
    } else if (editMode) {
      classes.push("border-edit-mode");
    } else {
      classes.push("border-view-mode");
    }

    if (locked) {
      classes.push("border-locked");
    }

    return classes.join(" ");
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
      <Lock size={12} />
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
    background: rgba(var(--theme-surface-rgb), 0.02);
  }

  .border-view-mode:hover {
    border-color: rgba(var(--theme-border-rgb), 0.3);
    background: rgba(var(--theme-surface-rgb), 0.05);
  }

  /* Edit mode - visible border */
  .border-edit-mode {
    border: 1px solid rgba(var(--theme-border-rgb), 0.4);
    background: rgba(var(--theme-surface-rgb), 0.03);
  }

  .border-edit-mode:hover {
    border-color: rgba(var(--theme-border-rgb), 0.6);
    background: rgba(var(--theme-surface-rgb), 0.08);
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
    border-color: var(--theme-warning);
    background: rgba(var(--theme-warning-rgb), 0.05);
    box-shadow:
      0 0 0 1px rgba(var(--theme-warning-rgb), 0.2),
      0 2px 8px rgba(var(--theme-warning-rgb), 0.15);
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
    background: var(--theme-warning);
    color: var(--theme-background);
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
    0%,
    100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.02);
    }
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
