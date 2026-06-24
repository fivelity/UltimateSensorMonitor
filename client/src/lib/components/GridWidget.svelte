<script lang="ts">
  import WidgetBorder from "$lib/components/widgets/core/WidgetBorder.svelte";
  import WidgetContent from "$lib/components/widgets/core/WidgetContent.svelte";
  import { editMode, selectedWidgets, uiUtils } from "$lib/stores";
  import { gridLayout } from "$lib/stores/gridLayout.svelte";
  import { gridInteraction } from "$lib/stores/interactions/grid.svelte";
  import type { WidgetConfig } from "$lib/types";

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

  const handles = [
    { id: "nw", cursor: "nw-resize" },
    { id: "ne", cursor: "ne-resize" },
    { id: "sw", cursor: "sw-resize" },
    { id: "se", cursor: "se-resize" },
  ];

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
  onpointerdown={(event) => gridInteraction.startDrag(event, widget.id)}
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
          onpointerdown={(event) =>
            gridInteraction.startResize(event, widget.id, handle.id)}
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
