<script lang="ts">
  import {
    COLUMN_OPTIONS,
    CORNER_RADIUSES,
    GRID_GAPS,
    ROW_OPTIONS,
    gridLayout,
  } from "$lib/stores/gridLayout.svelte";
  import { RotateCcw } from "@lucide/svelte";
</script>

<div
  class="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
>
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold">Grid Snap</h3>
    <button
      onclick={() => gridLayout.reset()}
      class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[var(--theme-border)] hover:bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      title="Reset grid settings"
      aria-label="Reset grid settings"
    >
      <RotateCcw size={12} />
      Reset
    </button>
  </div>

  <div class="space-y-3">
    <label class="block text-xs text-[var(--theme-text-muted)]">
      Columns
      <select
        class="mt-1 block w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-background)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        value={gridLayout.columns}
        onchange={(event) =>
          gridLayout.setColumns(
            Number(
              event.currentTarget.value,
            ) as (typeof COLUMN_OPTIONS)[number],
          )}
      >
        {#each COLUMN_OPTIONS as columns}
          <option value={columns}>{columns}</option>
        {/each}
      </select>
    </label>

    <label class="block text-xs text-[var(--theme-text-muted)]">
      Rows
      <select
        class="mt-1 block w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-background)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        value={gridLayout.rows}
        onchange={(event) =>
          gridLayout.setRows(
            Number(event.currentTarget.value) as (typeof ROW_OPTIONS)[number],
          )}
      >
        {#each ROW_OPTIONS as rows}
          <option value={rows}>{rows}</option>
        {/each}
      </select>
    </label>

    <label class="block text-xs text-[var(--theme-text-muted)]">
      Grid Gap
      <select
        class="mt-1 block w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-background)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        bind:value={gridLayout.gridGap}
        onchange={(event) =>
          gridLayout.setGridGap(
            Number(event.currentTarget.value) as (typeof GRID_GAPS)[number],
          )}
      >
        {#each GRID_GAPS as gap}
          <option value={gap}>{gap}px</option>
        {/each}
      </select>
    </label>

    <label class="block text-xs text-[var(--theme-text-muted)]">
      Corner Radius
      <select
        class="mt-1 block w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-background)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        bind:value={gridLayout.cornerRadius}
        onchange={(event) =>
          gridLayout.setCornerRadius(
            Number(
              event.currentTarget.value,
            ) as (typeof CORNER_RADIUSES)[number],
          )}
      >
        {#each CORNER_RADIUSES as radius}
          <option value={radius}>{radius}px</option>
        {/each}
      </select>
    </label>
  </div>
</div>
