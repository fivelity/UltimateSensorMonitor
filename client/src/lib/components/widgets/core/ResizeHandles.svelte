<script lang="ts">
  import { configService, type AppConfig } from "$lib/services/configService";
  import { dashboardInteraction } from "$lib/stores";
  import type { ResizeHandle } from "$lib/types";

  interface Props {
    widgetId: string;
  }

  const { widgetId }: Props = $props();

  let config = $state<AppConfig | null>(null);

  $effect(() => {
    configService.loadConfig().then((loadedConfig) => {
      config = loadedConfig;
    });
  });

  const isResizing = $derived($dashboardInteraction.mode === "resizing");
  const activeHandle = $derived($dashboardInteraction.activeHandle);

  const handles: {
    id: ResizeHandle;
    position: string;
    cursor: string;
    class: string;
  }[] = [
    {
      id: "nw",
      position: "top-0 left-0",
      cursor: "nw-resize",
      class: "corner-handle",
    },
    {
      id: "n",
      position: "top-0 left-1/2 -translate-x-1/2",
      cursor: "n-resize",
      class: "edge-handle-vertical",
    },
    {
      id: "ne",
      position: "top-0 right-0",
      cursor: "ne-resize",
      class: "corner-handle",
    },
    {
      id: "e",
      position: "top-1/2 right-0 -translate-y-1/2",
      cursor: "e-resize",
      class: "edge-handle-horizontal",
    },
    {
      id: "se",
      position: "bottom-0 right-0",
      cursor: "se-resize",
      class: "corner-handle",
    },
    {
      id: "s",
      position: "bottom-0 left-1/2 -translate-x-1/2",
      cursor: "s-resize",
      class: "edge-handle-vertical",
    },
    {
      id: "sw",
      position: "bottom-0 left-0",
      cursor: "sw-resize",
      class: "corner-handle",
    },
    {
      id: "w",
      position: "top-1/2 left-0 -translate-y-1/2",
      cursor: "w-resize",
      class: "edge-handle-horizontal",
    },
  ];

  $effect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      dashboardInteraction.updateResize(event, event.shiftKey);
    };

    const handleMouseUp = () => {
      dashboardInteraction.endResize();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  function handleResizeStart(event: MouseEvent, handleId: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();

    const constraints = {
      minWidth: config?.widgets.minWidgetWidth ?? 60,
      minHeight: config?.widgets.minWidgetHeight ?? 60,
      maxWidth: config?.widgets.maxWidgetWidth ?? 800,
      maxHeight: config?.widgets.maxWidgetHeight ?? 600,
    };

    dashboardInteraction.startResize(event, widgetId, handleId, constraints);
  }

  function _getCursorForHandle(handleId: string): string {
    const handle = handles.find((h) => h.id === handleId);
    return handle ? handle.cursor : "default";
  }
</script>

<div class="resize-handles absolute inset-0 pointer-events-none">
  {#each handles as handle (handle.id)}
    <div
      class="resize-handle absolute {handle.position} {handle.class}"
      class:active={activeHandle === handle.id}
      style:cursor={handle.cursor}
      data-resize-handle={handle.id}
      onmousedown={(e) => handleResizeStart(e, handle.id)}
      role="button"
      tabindex="-1"
      aria-label="Resize handle {handle.id}"
    ></div>
  {/each}

  {#if isResizing}
    <div
      class="resize-indicator absolute -top-8 -right-8 bg-[var(--theme-primary)] text-[var(--theme-background)] text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
    >
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
    background: rgba(var(--theme-primary-rgb), 0.8);
    border: 1px solid var(--theme-background);
    border-radius: 2px;
    opacity: 0;
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, var(--theme-elevation-opacity));
  }

  .resize-handle:hover,
  .resize-handle.active {
    opacity: 1;
    transform: scale(1.1);
    background: var(--theme-primary);
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
    font-family: var(--font-family), monospace;
  }

  /* Accessibility */
  .resize-handle:focus {
    outline: 2px solid rgba(var(--theme-primary-rgb), 0.5);
    outline-offset: 1px;
  }

  /* Performance optimizations */
  .resize-handle {
    will-change: opacity, transform;
  }

  .resize-indicator {
    will-change: transform;
  }
</style>
