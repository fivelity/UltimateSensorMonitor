<script lang="ts">
  import GridSettings from "$lib/components/GridSettings.svelte";
  import GridWidget from "$lib/components/GridWidget.svelte";
  import SnapGuides from "$lib/components/SnapGuides.svelte";
  import { editMode, uiUtils, widgets } from "$lib/stores";
  import { gridLayout } from "$lib/stores/gridLayout.svelte";
  import { gridInteraction } from "$lib/stores/interactions/grid.svelte";
  import type { WidgetConfig } from "$lib/types";

  const allWidgets = $derived<WidgetConfig[]>(Object.values($widgets));

  let gridContainer: HTMLDivElement | undefined = $state();

  function updateCellDimensions(
    columns: number,
    rows: number,
    gridGap: number,
  ) {
    if (!gridContainer) return;

    const rect = gridContainer.getBoundingClientRect();
    const contentWidth = rect.width - 2 * gridGap;
    const contentHeight = rect.height - 2 * gridGap;

    const cellWidth = (contentWidth - (columns - 1) * gridGap) / columns;
    const cellHeight = (contentHeight - (rows - 1) * gridGap) / rows;

    gridLayout.setCellDimensions(cellWidth, cellHeight, gridGap, gridGap);
  }

  $effect(() => {
    if (!gridContainer) return;
    const { columns, rows, gridGap } = gridLayout;
    updateCellDimensions(columns, rows, gridGap);
  });

  $effect(() => {
    if (!gridContainer) return;

    const observer = new ResizeObserver(() => {
      const { columns, rows, gridGap } = gridLayout;
      updateCellDimensions(columns, rows, gridGap);
    });
    observer.observe(gridContainer);

    return () => observer.disconnect();
  });

  function handleCanvasClick() {
    uiUtils.clearSelection();
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable
    );
  }

  function handleCanvasKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      uiUtils.clearSelection();
      return;
    }

    if ($editMode !== "edit") return;
    if (isEditableTarget(event.target)) return;

    const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };

    const direction = directionMap[event.key];
    if (!direction) return;

    event.preventDefault();
    const multiplier =
      event.ctrlKey || event.metaKey ? 10 : event.shiftKey ? 5 : 1;
    gridInteraction.nudgeSelected(direction, multiplier);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="relative w-full h-full overflow-auto bg-[var(--theme-background)]"
  onclick={handleCanvasClick}
  onkeydown={handleCanvasKeydown}
  role="application"
  aria-label="Grid canvas"
  tabindex="-1"
  data-grid-canvas
>
  <div class="relative w-full h-full" data-grid-canvas-content>
    <div class="absolute inset-0 pointer-events-none z-40">
      <SnapGuides guides={gridInteraction.snapGuides} />
    </div>

    <!-- Visible responsive grid cells -->
    <div
      class="grid-cells absolute inset-0 pointer-events-none"
      aria-hidden="true"
      bind:this={gridContainer}
      style:display="grid"
      style:grid-template-columns="repeat({gridLayout.columns}, 1fr)"
      style:grid-template-rows="repeat({gridLayout.rows}, 1fr)"
      style:gap="{gridLayout.gridGap}px"
      style:padding="{gridLayout.gridGap}px"
      style:--grid-cell-radius="{gridLayout.effectiveCornerRadius}px"
    >
      {#each Array(gridLayout.columns * gridLayout.rows) as _, i (i)}
        <div
          class="grid-cell box-border bg-[var(--theme-surface)] border border-[var(--theme-border)]"
          style:border-radius="var(--grid-cell-radius)"
        ></div>
      {/each}
    </div>

    {#each allWidgets as widget (widget.id)}
      <GridWidget {widget} />
    {/each}
  </div>

  <div class="absolute top-4 right-4 z-50 w-56">
    <GridSettings />
  </div>
</div>
