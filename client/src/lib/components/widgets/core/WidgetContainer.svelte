<script lang="ts">
  import { dashboardInteraction, editMode, selectedWidgets } from "$lib/stores";
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

  const isSelected = $derived(
    $selectedWidgets.type === "widget" &&
      $selectedWidgets.ids.includes(widget.id),
  );
  const isLocked = $derived(widget.is_locked);
  const showControls = $derived(
    $editMode === "edit" && isSelected && !isLocked,
  );
  const canEdit = $derived($editMode === "edit");
  const isDragging = $derived(
    $dashboardInteraction.mode === "dragging" &&
      $dashboardInteraction.activeWidgetIds.includes(widget.id),
  );
  const isResizing = $derived(
    $dashboardInteraction.mode === "resizing" &&
      $dashboardInteraction.activeWidgetIds.includes(widget.id),
  );

  $effect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      dashboardInteraction.updateDrag(event);
    };

    const handleMouseUp = () => {
      dashboardInteraction.endDrag();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  function handleContainerMouseDown(event: MouseEvent) {
    if (!canEdit || isLocked) return;

    event.preventDefault();
    event.stopPropagation();

    const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
    onwidgetSelected?.({ id: widget.id, multiSelect });

    const target = event.target as HTMLElement;
    if (!target.closest("[data-resize-handle]")) {
      dashboardInteraction.startDrag(event, widget.id);
    }
  }

  function handleContainerClick(event: MouseEvent) {
    if (!canEdit) return;
    event.stopPropagation();
    const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
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

  function handleLockToggle() {
    onwidgetUpdated?.({
      id: widget.id,
      updates: { is_locked: !widget.is_locked },
    });
  }

  function handleDelete() {
    onwidgetDelete?.({ id: widget.id });
  }
</script>

<div
  class="widget-container absolute cursor-pointer"
  class:widget-selected={isSelected}
  class:widget-locked={isLocked}
  class:widget-dragging={isDragging}
  class:widget-edit-mode={canEdit}
  class:widget-resizing={isResizing}
  style=""
  style:left="{widget.pos_x}px"
  style:top="{widget.pos_y}px"
  style:width="{widget.width}px"
  style:height="{widget.height}px"
  style:z-index={widget.z_index}
  style:transform="rotate({widget.rotation}deg)"
  onmousedown={handleContainerMouseDown}
  onclick={handleContainerClick}
  oncontextmenu={handleContextMenu}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onwidgetSelected?.({
        id: widget.id,
        multiSelect: event.shiftKey || event.ctrlKey || event.metaKey,
      });
    }
  }}
  role="button"
  tabindex="0"
  aria-label="Widget {widget.custom_label || widget.sensor_id}"
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
      ondelete={handleDelete}
    />
  {/if}

  <!-- Resize Handles (Edit Mode Only) -->
  {#if canEdit && !isLocked}
    <ResizeHandles widgetId={widget.id} />
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

  .widget-resizing {
    user-select: none;
    pointer-events: none;
  }

  .widget-edit-mode {
    cursor: move;
  }

  .widget-edit-mode.widget-locked {
    cursor: not-allowed;
  }
</style>
