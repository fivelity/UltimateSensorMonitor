<script lang="ts">
  const {
    onresize,
    onresizeStart,
    onresizeEnd,
  }: {
    onresize?: (data: { width: number; height: number; x?: number; y?: number }) => void;
    onresizeStart?: () => void;
    onresizeEnd?: () => void;
  } = $props();

  let isResizing = $state(false);
  let activeHandle = $state('');
  let startPos = $state({ x: 0, y: 0 });
  let startSize = $state({ width: 0, height: 0 });
  let startPosition = $state({ x: 0, y: 0 });

  // Handle definitions with cursor styles
  const handles = [
    { id: 'nw', position: 'top-0 left-0', cursor: 'nw-resize', class: 'corner-handle' },
    { id: 'n', position: 'top-0 left-1/2 -translate-x-1/2', cursor: 'n-resize', class: 'edge-handle-vertical' },
    { id: 'ne', position: 'top-0 right-0', cursor: 'ne-resize', class: 'corner-handle' },
    { id: 'e', position: 'top-1/2 right-0 -translate-y-1/2', cursor: 'e-resize', class: 'edge-handle-horizontal' },
    { id: 'se', position: 'bottom-0 right-0', cursor: 'se-resize', class: 'corner-handle' },
    { id: 's', position: 'bottom-0 left-1/2 -translate-x-1/2', cursor: 's-resize', class: 'edge-handle-vertical' },
    { id: 'sw', position: 'bottom-0 left-0', cursor: 'sw-resize', class: 'corner-handle' },
    { id: 'w', position: 'top-1/2 left-0 -translate-y-1/2', cursor: 'w-resize', class: 'edge-handle-horizontal' }
  ];

  $effect(() => {
    return () => {
      // Cleanup event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  function startResize(event: MouseEvent, handleId: string) {
    event.preventDefault();
    event.stopPropagation();

    isResizing = true;
    activeHandle = handleId;
    startPos = { x: event.clientX, y: event.clientY };

    // Get current widget dimensions and position from parent
    const widget = (event.target as HTMLElement).closest('.widget-container') as HTMLElement;
    if (widget) {
      const style = window.getComputedStyle(widget);

      startSize = {
        width: parseInt(style.width),
        height: parseInt(style.height)
      };

      startPosition = {
        x: parseInt(style.left),
        y: parseInt(style.top)
      };
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = getCursorForHandle(handleId);

    onresizeStart?.();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing) return;

    const deltaX = event.clientX - startPos.x;
    const deltaY = event.clientY - startPos.y;

    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startPosition.x;
    let newY = startPosition.y;

    // Calculate new dimensions based on active handle
    switch (activeHandle) {
      case 'nw':
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height - deltaY;
        newX = startPosition.x + deltaX;
        newY = startPosition.y + deltaY;
        break;
      case 'n':
        newHeight = startSize.height - deltaY;
        newY = startPosition.y + deltaY;
        break;
      case 'ne':
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height - deltaY;
        newY = startPosition.y + deltaY;
        break;
      case 'e':
        newWidth = startSize.width + deltaX;
        break;
      case 'se':
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height + deltaY;
        break;
      case 's':
        newHeight = startSize.height + deltaY;
        break;
      case 'sw':
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height + deltaY;
        newX = startPosition.x + deltaX;
        break;
      case 'w':
        newWidth = startSize.width - deltaX;
        newX = startPosition.x + deltaX;
        break;
    }

    // Apply minimum constraints
    const minSize = 60;
    if (newWidth < minSize) {
      if (activeHandle.includes('w')) {
        newX = startPosition.x + (startSize.width - minSize);
      }
      newWidth = minSize;
    }
    if (newHeight < minSize) {
      if (activeHandle.includes('n')) {
        newY = startPosition.y + (startSize.height - minSize);
      }
      newHeight = minSize;
    }

    // Dispatch resize event
    const resizeData: { width: number; height: number; x?: number; y?: number } = { width: newWidth, height: newHeight };
    if (activeHandle.includes('w') || activeHandle.includes('n')) {
      resizeData.x = newX;
      resizeData.y = newY;
    }

    onresize?.(resizeData);
  }

  function handleMouseUp() {
    if (!isResizing) return;

    isResizing = false;
    activeHandle = '';
    document.body.style.cursor = '';

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    onresizeEnd?.();
  }

  function getCursorForHandle(handleId: string): string {
    const handle = handles.find(h => h.id === handleId);
    return handle ? handle.cursor : 'default';
  }
</script>

<div class="resize-handles absolute inset-0 pointer-events-none">
  {#each handles as handle}
    <div
      class="resize-handle absolute {handle.position} {handle.class}"
      class:active={activeHandle === handle.id}
      style="cursor: {handle.cursor}"
      data-resize-handle={handle.id}
      onmousedown={(e) => startResize(e, handle.id)}
      role="button"
      tabindex="-1"
    ></div>
  {/each}

  <!-- Resize indicator when actively resizing -->
  {#if isResizing}
    <div class="resize-indicator absolute -top-8 -right-8 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none">
      Resizing
    </div>
  {/if}
</div>

<style>
  .resize-handles {
    z-index: 100;
  }

  .resize-handle {
    pointer-events: auto;
    background: rgba(59, 130, 246, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease, transform 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .resize-handle:hover,
  .resize-handle.active {
    opacity: 1;
    transform: scale(1.1);
    background: rgba(59, 130, 246, 1);
  }

  /* Show handles when parent is hovered or selected */
  :global(.widget-container:hover) .resize-handle,
  :global(.widget-selected) .resize-handle {
    opacity: 0.7;
  }

  :global(.widget-container:hover) .resize-handle:hover,
  :global(.widget-selected) .resize-handle:hover {
    opacity: 1;
  }

  /* Corner handles */
  .corner-handle {
    width: 8px;
    height: 8px;
    margin: -4px;
  }

  /* Edge handles */
  .edge-handle-horizontal {
    width: 6px;
    height: 20px;
    margin: -10px -3px;
  }

  .edge-handle-vertical {
    width: 20px;
    height: 6px;
    margin: -3px -10px;
  }

  /* Resize indicator */
  .resize-indicator {
    z-index: 1000;
    backdrop-filter: blur(4px);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  /* Dark mode adjustments */
  :global(.dark) .resize-handle {
    background: rgba(96, 165, 250, 0.8);
    border-color: rgba(255, 255, 255, 0.7);
  }

  :global(.dark) .resize-handle:hover,
  :global(.dark) .resize-handle.active {
    background: rgba(96, 165, 250, 1);
  }

  /* Accessibility */
  .resize-handle:focus {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 1px;
  }

  /* Performance optimizations */
  .resize-handle {
    will-change: opacity, transform;
  }

  .resize-handles {
    contain: layout style;
  }
</style>
