<script lang="ts">
  import GridSettings from "$lib/components/GridSettings.svelte";
  import GridWidget from "$lib/components/GridWidget.svelte";
  import { uiUtils, widgets } from "$lib/stores";
  import { gridLayout } from "$lib/stores/gridLayout.svelte";
  import type { WidgetConfig } from "$lib/types";

  const allWidgets = $derived<WidgetConfig[]>(Object.values($widgets));

  const contentBounds = $derived.by(() => {
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
      width: maxX > 0 ? `${maxX + 100}px` : "100%",
      height: maxY > 0 ? `${maxY + 100}px` : "100%",
    };
  });

  const backgroundStyle = $derived({
    backgroundSize: `${gridLayout.gridStep}px ${gridLayout.gridStep}px`,
    backgroundImage: `
      linear-gradient(to right, var(--theme-border) 1px, transparent 1px),
      linear-gradient(to bottom, var(--theme-border) 1px, transparent 1px)
    `,
  });

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
    style:background-size={backgroundStyle.backgroundSize}
    style:background-image={backgroundStyle.backgroundImage}
  >
    {#each allWidgets as widget (widget.id)}
      <GridWidget {widget} />
    {/each}
  </div>

  <div class="absolute top-4 right-4 z-50 w-56">
    <GridSettings />
  </div>
</div>
