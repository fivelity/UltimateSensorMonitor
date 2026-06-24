<script lang="ts">
  import WidgetBorder from "$lib/components/widgets/core/WidgetBorder.svelte";
  import WidgetContent from "$lib/components/widgets/core/WidgetContent.svelte";
  import { editMode, selectedWidgets, uiUtils } from "$lib/stores";
  import { widgetUtils } from "$lib/stores/data/widgets";
  import { gridLayout } from "$lib/stores/gridLayout.svelte";
  import {
    BatchCommand,
    MoveWidgetCommand,
    ResizeWidgetCommand,
    historyStore,
  } from "$lib/stores/history";
  import type { WidgetConfig } from "$lib/types";
  import { roundToPrecision } from "$lib/utils/geometry";

  interface Props {
    widget: WidgetConfig;
  }

  const { widget }: Props = $props();

  const isSelected = $derived(
    $selectedWidgets.type === "widget" &&
      $selectedWidgets.ids.includes(widget.id),
  );
  const canEdit = $derived($editMode === "edit");

  const left = $derived(gridLayout.snapX(widget.pos_x));
  const top = $derived(gridLayout.snapY(widget.pos_y));
  const width = $derived(gridLayout.snapWidth(widget.width));
  const height = $derived(gridLayout.snapHeight(widget.height));
  const radius = $derived(gridLayout.effectiveCornerRadius);

  let isDragging = $state(false);
  let isResizing = $state(false);
  let activeHandle = $state<string>("");
  let startPointer = $state({ x: 0, y: 0 });
  let startWidget = $state({
    pos_x: 0,
    pos_y: 0,
    width: 0,
    height: 0,
  });

  const minSize = 32;

  const handles = [
    { id: "nw", cursor: "nw-resize" },
    { id: "ne", cursor: "ne-resize" },
    { id: "sw", cursor: "sw-resize" },
    { id: "se", cursor: "se-resize" },
  ];

  function handleDragStart(event: PointerEvent) {
    if (!canEdit || widget.is_locked) return;
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("[data-resize-handle]")) return;

    event.preventDefault();
    event.stopPropagation();

    const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
    uiUtils.selectWidget(widget.id, multiSelect);

    isDragging = true;
    startPointer = { x: event.clientX, y: event.clientY };
    startWidget = {
      pos_x: widget.pos_x,
      pos_y: widget.pos_y,
      width: widget.width,
      height: widget.height,
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleResizeStart(event: PointerEvent, handleId: string) {
    if (!canEdit || widget.is_locked) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    uiUtils.selectWidget(widget.id, false);

    isResizing = true;
    activeHandle = handleId;
    startPointer = { x: event.clientX, y: event.clientY };
    startWidget = {
      pos_x: widget.pos_x,
      pos_y: widget.pos_y,
      width: widget.width,
      height: widget.height,
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(event: PointerEvent) {
    if (isDragging) {
      const dx = event.clientX - startPointer.x;
      const dy = event.clientY - startPointer.y;
      const newX = Math.max(0, startWidget.pos_x + dx);
      const newY = Math.max(0, startWidget.pos_y + dy);

      widgetUtils.updateWidget(widget.id, {
        pos_x: roundToPrecision(gridLayout.snapX(newX), 1),
        pos_y: roundToPrecision(gridLayout.snapY(newY), 1),
      });
    } else if (isResizing) {
      const dx = event.clientX - startPointer.x;
      const dy = event.clientY - startPointer.y;

      let newX = startWidget.pos_x;
      let newY = startWidget.pos_y;
      let newW = startWidget.width;
      let newH = startWidget.height;

      switch (activeHandle) {
        case "nw":
          newW = startWidget.width - dx;
          newH = startWidget.height - dy;
          newX = startWidget.pos_x + dx;
          newY = startWidget.pos_y + dy;
          break;
        case "ne":
          newW = startWidget.width + dx;
          newH = startWidget.height - dy;
          newY = startWidget.pos_y + dy;
          break;
        case "sw":
          newW = startWidget.width - dx;
          newH = startWidget.height + dy;
          newX = startWidget.pos_x + dx;
          break;
        case "se":
          newW = startWidget.width + dx;
          newH = startWidget.height + dy;
          break;
      }

      if (newW < minSize) {
        if (activeHandle.includes("w")) {
          newX += newW - minSize;
        }
        newW = minSize;
      }
      if (newH < minSize) {
        if (activeHandle.includes("n")) {
          newY += newH - minSize;
        }
        newH = minSize;
      }

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newX = gridLayout.snapX(newX);
      newY = gridLayout.snapY(newY);
      newW = gridLayout.snapWidth(newW);
      newH = gridLayout.snapHeight(newH);

      widgetUtils.updateWidget(widget.id, {
        pos_x: roundToPrecision(newX, 1),
        pos_y: roundToPrecision(newY, 1),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    }
  }

  function handlePointerUp(event: PointerEvent) {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    if (isDragging) {
      isDragging = false;
      const newPos = { x: widget.pos_x, y: widget.pos_y };
      if (newPos.x !== startWidget.pos_x || newPos.y !== startWidget.pos_y) {
        historyStore.executeCommand(
          new BatchCommand(
            [
              new MoveWidgetCommand(
                widget.id,
                { x: startWidget.pos_x, y: startWidget.pos_y },
                newPos,
                widgetUtils.updateWidget,
              ),
            ],
            "Move widget",
          ),
        );
      }
    }

    if (isResizing) {
      isResizing = false;
      const newPos = { x: widget.pos_x, y: widget.pos_y };
      const newSize = { width: widget.width, height: widget.height };
      const commands: (MoveWidgetCommand | ResizeWidgetCommand)[] = [];

      if (newPos.x !== startWidget.pos_x || newPos.y !== startWidget.pos_y) {
        commands.push(
          new MoveWidgetCommand(
            widget.id,
            { x: startWidget.pos_x, y: startWidget.pos_y },
            newPos,
            widgetUtils.updateWidget,
          ),
        );
      }
      if (
        newSize.width !== startWidget.width ||
        newSize.height !== startWidget.height
      ) {
        commands.push(
          new ResizeWidgetCommand(
            widget.id,
            { width: startWidget.width, height: startWidget.height },
            newSize,
            widgetUtils.updateWidget,
          ),
        );
      }

      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, "Resize widget"),
        );
      }
      activeHandle = "";
    }
  }

  function handleClick(event: MouseEvent) {
    if (!canEdit) return;
    event.stopPropagation();
    const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
    uiUtils.selectWidget(widget.id, multiSelect);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      uiUtils.selectWidget(
        widget.id,
        event.shiftKey || event.ctrlKey || event.metaKey,
      );
    }
  }
</script>

<div
  class="absolute"
  class:cursor-move={canEdit && !widget.is_locked}
  class:cursor-pointer={!canEdit || widget.is_locked}
  class:widget-selected={isSelected}
  style:left="{left}px"
  style:top="{top}px"
  style:width="{width}px"
  style:height="{height}px"
  style:--grid-radius="{radius}px"
  style:border-radius="{radius}px"
  style:z-index={widget.z_index}
  onpointerdown={handleDragStart}
  onclick={handleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex={canEdit ? 0 : -1}
  aria-label="Widget {widget.custom_label || widget.sensor_id}"
>
  <div
    class="relative w-full h-full overflow-hidden"
    style:border-radius="{radius}px"
  >
    <WidgetBorder {isSelected} isLocked={widget.is_locked} {canEdit} />
    <WidgetContent {widget} />

    {#if canEdit && !widget.is_locked}
      {#each handles as handle (handle.id)}
        <div
          class="absolute w-2 h-2 -m-1 bg-[var(--theme-primary)] border border-[var(--theme-background)] rounded-sm opacity-0 hover:opacity-100 transition-opacity"
          class:opacity-100={isSelected}
          style:cursor={handle.cursor}
          style:left={handle.id.includes("w") ? "-4px" : "auto"}
          style:right={handle.id.includes("e") ? "-4px" : "auto"}
          style:top={handle.id.includes("n") ? "-4px" : "auto"}
          style:bottom={handle.id.includes("s") ? "-4px" : "auto"}
          data-resize-handle={handle.id}
          onpointerdown={(event) => handleResizeStart(event, handle.id)}
          role="button"
          tabindex="-1"
          aria-label="Resize handle {handle.id}"
        ></div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .widget-selected {
    box-shadow: 0 0 0 2px var(--theme-primary);
  }
</style>
