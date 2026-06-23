<script lang="ts">
  import { gaugeTypeMetadata, gaugeTypeOptions } from "$lib/constants/gauges";
  import type { GaugeType, SensorInfo } from "$lib/types";
  import { X } from "@lucide/svelte";

  interface Props {
    sensor: SensorInfo;
    anchorRect: DOMRect;
    oncreate: (sensor: SensorInfo, gaugeType: GaugeType) => void;
    onclose: () => void;
  }

  const { sensor, anchorRect, oncreate, onclose }: Props = $props();

  function handleCreate(gaugeType: GaugeType) {
    oncreate(sensor, gaugeType);
  }

  function popoverStyle(): string {
    // Position to the right of the anchor button, falling back to left if needed
    const viewportWidth = window.innerWidth;
    let left = anchorRect.right + 8;
    if (left + 240 > viewportWidth) {
      left = Math.max(8, anchorRect.left - 248);
    }
    return `position: fixed; top: ${anchorRect.top}px; left: ${left}px; z-index: 100;`;
  }

  function handleClickOutside(event: MouseEvent) {
    const _target = event.target as Node;
    const rect = new DOMRect(
      anchorRect.left,
      anchorRect.top,
      anchorRect.width,
      anchorRect.height,
    );
    const clickInAnchor =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (
      !clickInAnchor &&
      !(event.target as HTMLElement)?.closest(".sensor-add-popover")
    ) {
      onclose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="sensor-add-popover w-60 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg p-3"
  style={popoverStyle()}
>
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm font-medium text-[var(--theme-text)] truncate pr-2">
      Add {sensor.name}
    </span>
    <button
      type="button"
      onclick={onclose}
      class="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      aria-label="Close"
    >
      <X size={14} />
    </button>
  </div>

  <div class="grid grid-cols-2 gap-2">
    {#each gaugeTypeOptions as gaugeType}
      {@const meta = gaugeTypeMetadata[gaugeType]}
      <button
        type="button"
        onclick={() => handleCreate(gaugeType)}
        class="flex flex-col items-center gap-1 p-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        title={meta.description}
      >
        <span class="text-xs font-medium text-[var(--theme-text)]"
          >{meta.label}</span
        >
        <span class="text-[10px] text-[var(--theme-text-muted)]">
          {meta.defaultWidth}×{meta.defaultHeight}
        </span>
      </button>
    {/each}
  </div>
</div>
