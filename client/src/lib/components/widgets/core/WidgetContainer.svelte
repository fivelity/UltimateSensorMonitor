<script lang="ts">
  import { configService, type AppConfig } from "$lib/services/configService";
  import { editMode, selectedWidgets } from "$lib/stores";
  import type { WidgetConfig } from "$lib/types";

  import ResizeHandles from "./ResizeHandles.svelte";
  import WidgetBorder from "./WidgetBorder.svelte";
  import WidgetContent from "./WidgetContent.svelte";
  import WidgetControls from "./WidgetControls.svelte";

  const {
    widget,
    onwidgetUpdated,
    onwidgetSelected,
    onwidgetContextMenu,
    onwidgetDelete,
  }: {
    widget: WidgetConfig;
    onwidgetUpdated?: (_data: {
      id: string;
      updates: Partial<WidgetConfig>;
    }) => void;
    onwidgetSelected?: (_data: { id: string; multiSelect: boolean }) => void;
    onwidgetContextMenu?: (_data: { id: string; x: number; y: number }) => void;
    onwidgetDelete?: (_data: { id: string }) => void;
  } = $props();

  let containerElement: HTMLDivElement | undefined = $state();
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });
  let initialPos = $state({ x: 0, y: 0 });
  let config = $state<AppConfig | null>(null);

  // Reactive state
  const isSelected = $derived(
    $selectedWidgets.type === "widget" &&
      $selectedWidgets.ids.includes(widget.id),
  );
  const isLocked = $derived(widget.is_locked);
  const showControls = $derived(
    $editMode === "edit" && isSelected && !isLocked,
  );
  const canEdit = $derived($editMode === "edit");

  // Performance optimization
  let updateThrottle = $state(0);
  const throttleDelay = $derived(
    config?.performance.widgetUpdateThrottle ?? 16,
  );

  $effect(() => {
    // Load configuration
    configService.loadConfig().then((loadedConfig) => {
      config = loadedConfig;
    });

    return () => {
      // Cleanup
      if (updateThrottle) {
        clearTimeout(updateThrottle);
      }
    };
  });

  $effect(() => {
    if (!isDragging) return;

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  });

  function handleContainerMouseDown(event: MouseEvent) {
    if (!canEdit || isLocked) return;

    event.preventDefault();
    event.stopPropagation();

    // Select widget
    const multiSelect = event.shiftKey || event.ctrlKey;
    onwidgetSelected?.({ id: widget.id, multiSelect });

    // Start drag if not clicking on resize handle
    const target = event.target as HTMLElement;
    if (!target.closest("[data-resize-handle]")) {
      startDrag(event);
    }
  }

  function handleContainerClick(event: MouseEvent) {
    if (!canEdit) return;

    event.stopPropagation();
    const multiSelect = event.shiftKey || event.ctrlKey;
    onwidgetSelected?.({ id: widget.id, multiSelect });
  }

  function handleContextMenu(event: MouseEvent) {
    if (!canEdit) return;

    event.preventDefault();
    event.stopPropagation();

    onwidgetContextMenu?.({
      id: widget.id,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function startDrag(event: MouseEvent) {
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    initialPos = { x: widget.pos_x, y: widget.pos_y };
  }

  function handleDragMove(event: MouseEvent) {
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
      onwidgetUpdated?.({
        id: widget.id,
        updates: { pos_x: newX, pos_y: newY },
      });

      updateThrottle = 0;
    }, throttleDelay);
  }

  function handleDragEnd() {
    isDragging = false;
  }

  function handleResize(data: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  }) {
    const { width, height } = data;

    // Apply size constraints
    const minWidth = config?.widgets.minWidgetWidth ?? 50;
    const minHeight = config?.widgets.minWidgetHeight ?? 30;
    const maxWidth = config?.widgets.maxWidgetWidth ?? 800;
    const maxHeight = config?.widgets.maxWidgetHeight ?? 600;

    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, height));

    onwidgetUpdated?.({
      id: widget.id,
      updates: { width: constrainedWidth, height: constrainedHeight },
    });
  }

  function handleLockToggle() {
    onwidgetUpdated?.({
      id: widget.id,
      updates: { is_locked: !widget.is_locked },
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
  onmousedown={handleContainerMouseDown}
  onclick={handleContainerClick}
  oncontextmenu={handleContextMenu}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onwidgetSelected?.({
        id: widget.id,
        multiSelect: event.shiftKey || event.ctrlKey,
      });
    }
  }}
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
      onlockToggle={handleLockToggle}
      ondelete={() => onwidgetDelete?.({ id: widget.id })}
    />
  {/if}

  <!-- Resize Handles (Edit Mode Only) -->
  {#if canEdit && !isLocked}
    <ResizeHandles onresize={handleResize} />
  {/if}
</div>

<style>
  .widget-container {
    transition: box-shadow 0.2s ease;
    will-change: transform;
  }

  .widget-container:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, var(--theme-elevation-opacity));
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
