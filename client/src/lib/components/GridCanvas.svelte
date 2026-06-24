<script lang="ts">
  import GridSettings from "$lib/components/GridSettings.svelte";
  import GridWidget from "$lib/components/GridWidget.svelte";
  import { uiUtils, widgets } from "$lib/stores";
  import { gridLayout } from "$lib/stores/gridLayout.svelte";
  import type { WidgetConfig } from "$lib/types";

  const allWidgets = $derived<WidgetConfig[]>(Object.values($widgets));

  const contentMetrics = $derived.by(() => {
    let maxX = 0;
    let maxY = 0;

    for (const widget of allWidgets) {
      const right =
        gridLayout.snapX(widget.pos_x) + gridLayout.snapWidth(widget.width);
      const bottom =
        gridLayout.snapY(widget.pos_y) + gridLayout.snapHeight(widget.height);
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }

    return {
      width: maxX > 0 ? maxX + 100 : 0,
      height: maxY > 0 ? maxY + 100 : 0,
    };
  });

  const contentBounds = $derived({
    width: contentMetrics.width > 0 ? `${contentMetrics.width}px` : "100%",
    height: contentMetrics.height > 0 ? `${contentMetrics.height}px` : "100%",
  });

  const columns = $derived(
    Math.max(1, Math.ceil(contentMetrics.width / gridLayout.gridStep)),
  );
  const rows = $derived(
    Math.max(1, Math.ceil(contentMetrics.height / gridLayout.gridStep)),
  );

  function handleCanvasClick() {
    uiUtils.clearSelection();
  }

  function handleCanvasKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      uiUtils.clearSelection();
    }
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
  <div
    class="relative"
    data-grid-canvas-content
    style:width="100%"
    style:height="100%"
    style:min-width={contentBounds.width}
    style:min-height={contentBounds.height}
  >
    <!-- Visible grid cells: one UI element per cell instead of gridlines -->
    <div
      class="grid-cells absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style:display="grid"
      style:grid-template-columns="repeat({columns}, {gridLayout.cellSize}px)"
      style:grid-template-rows="repeat({rows}, {gridLayout.cellSize}px)"
      style:gap="{gridLayout.gridGap}px"
      style:--grid-cell-radius="{gridLayout.effectiveCornerRadius}px"
    >
      {#each Array(columns * rows) as _, i (i)}
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
