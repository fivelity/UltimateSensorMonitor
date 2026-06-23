<script lang="ts">
  import type { SnapGuide } from "$lib/stores/interactions/snap";

  interface Props {
    guides: SnapGuide[];
  }

  const { guides }: Props = $props();
</script>

{#if guides.length > 0}
  <div class="snap-guides">
    {#each guides as guide (guide.type + guide.position)}
      {#if guide.type === "horizontal"}
        <div
          class="guide guide-horizontal"
          style=""
          style:top="{guide.position}px"
          style:border-color={guide.color}
          style:box-shadow="0 0 4px rgba({guide.colorRgb}, 0.25)"
        ></div>
      {:else}
        <div
          class="guide guide-vertical"
          style=""
          style:left="{guide.position}px"
          style:border-color={guide.color}
          style:box-shadow="0 0 4px rgba({guide.colorRgb}, 0.25)"
        ></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .snap-guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    overflow: hidden;
  }

  .guide {
    position: absolute;
    border-style: dashed;
    border-width: 1px;
    opacity: 0.8;
    animation: fadeIn 0.2s ease-out;
  }

  .guide-horizontal {
    left: 0;
    right: 0;
    height: 0;
    border-top-width: 1px;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }

  .guide-vertical {
    top: 0;
    bottom: 0;
    width: 0;
    border-left-width: 1px;
    border-top: none;
    border-right: none;
    border-bottom: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.8;
    }
  }

  /* Visual feedback for different guide types */
  .guide:before {
    content: "";
    position: absolute;
    background: currentColor;
    border-radius: 2px;
    opacity: 0.6;
  }

  .guide-horizontal:before {
    left: 50%;
    top: -2px;
    width: 4px;
    height: 4px;
    transform: translateX(-50%);
  }

  .guide-vertical:before {
    top: 50%;
    left: -2px;
    width: 4px;
    height: 4px;
    transform: translateY(-50%);
  }
</style>
