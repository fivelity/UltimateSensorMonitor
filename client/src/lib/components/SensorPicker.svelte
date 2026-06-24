<script lang="ts">
  import { availableSensors, sensorData } from "$lib/stores";
  import type { SensorInfo } from "$lib/types";
  import { Check, Star } from "@lucide/svelte";
  import SearchInput from "./SearchInput.svelte";

  interface Props {
    selectedSensorId?: string;
    recentIds?: string[];
    favoriteIds?: string[];
    placeholder?: string;
    onselect?: (sensorId: string) => void;
    onclose?: () => void;
    id?: string;
  }

  const {
    selectedSensorId = "",
    recentIds = [],
    favoriteIds = [],
    placeholder = "Search sensors...",
    onselect,
    onclose,
    id = undefined,
  }: Props = $props();

  let query = $state("");
  let highlightedIndex = $state(0);
  let listElement = $state<HTMLDivElement | undefined>();

  const lowerQuery = $derived(query.toLowerCase().trim());

  const allSensors = $derived($availableSensors);

  const favoriteSensors = $derived(
    allSensors.filter((s) => favoriteIds.includes(s.id)),
  );
  const recentSensors = $derived(
    allSensors.filter(
      (s) => recentIds.includes(s.id) && !favoriteIds.includes(s.id),
    ),
  );
  const otherSensors = $derived(
    allSensors.filter(
      (s) => !favoriteIds.includes(s.id) && !recentIds.includes(s.id),
    ),
  );

  const groupedSensors = $derived(() => {
    const filter = (sensors: SensorInfo[]) =>
      lowerQuery.length === 0
        ? sensors
        : sensors.filter(
            (s) =>
              s.name.toLowerCase().includes(lowerQuery) ||
              s.category.toLowerCase().includes(lowerQuery) ||
              s.source.toLowerCase().includes(lowerQuery) ||
              s.unit.toLowerCase().includes(lowerQuery),
          );

    const groups: { title: string; sensors: SensorInfo[] }[] = [];
    const fav = filter(favoriteSensors);
    if (fav.length > 0) groups.push({ title: "Favorites", sensors: fav });
    const recent = filter(recentSensors);
    if (recent.length > 0) groups.push({ title: "Recent", sensors: recent });

    const byCategory = filter(otherSensors).reduce(
      (acc, sensor) => {
        if (!acc[sensor.category]) acc[sensor.category] = [];
        acc[sensor.category].push(sensor);
        return acc;
      },
      {} as Record<string, SensorInfo[]>,
    );

    Object.entries(byCategory).forEach(([category, sensors]) => {
      groups.push({ title: category.replace("_", " "), sensors });
    });

    return groups;
  });

  const flatSensors = $derived(
    groupedSensors().flatMap((group) => group.sensors),
  );

  function formatValue(value: number | string | undefined): string {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "--";
  }

  function handleSelect(sensorId: string) {
    onselect?.(sensorId);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, flatSensors.length - 1);
      scrollHighlightedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      scrollHighlightedIntoView();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const sensor = flatSensors[highlightedIndex];
      if (sensor) {
        handleSelect(sensor.id);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onclose?.();
    }
  }

  function scrollHighlightedIntoView() {
    const element = listElement?.querySelector(
      `[data-index="${highlightedIndex}"]`,
    );
    element?.scrollIntoView({ block: "nearest" });
  }

  $effect(() => {
    // Reset highlight when the query changes
    highlightedIndex = 0;
  });

  $effect(() => {
    // Pre-highlight selected sensor when it is visible
    const selectedIndex = flatSensors.findIndex(
      (s) => s.id === selectedSensorId,
    );
    if (selectedIndex >= 0) {
      highlightedIndex = selectedIndex;
    }
  });
</script>

<div class="flex flex-col gap-2">
  <SearchInput
    value={query}
    {id}
    {placeholder}
    onchange={(value) => (query = value)}
    onclear={() => (query = "")}
    autofocus={true}
  />

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={listElement}
    tabindex="0"
    onkeydown={handleKeydown}
    class="max-h-64 overflow-y-auto border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)]"
  >
    {#if flatSensors.length === 0}
      <div class="p-4 text-sm text-[var(--theme-text-muted)] text-center">
        No sensors match your search
      </div>
    {:else}
      {@const groups = groupedSensors()}
      {@const flat = flatSensors}
      {#each groups as group}
        <div
          class="px-3 py-1 text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wide bg-[var(--theme-surface)] border-b border-[var(--theme-border)]"
        >
          {group.title}
        </div>
        {#each group.sensors as sensor, _idx}
          {@const globalIndex = flat.indexOf(sensor)}
          {@const isSelected = sensor.id === selectedSensorId}
          {@const isHighlighted = globalIndex === highlightedIndex}
          {@const currentData = $sensorData[sensor.id]}
          <button
            type="button"
            data-index={globalIndex}
            onclick={() => handleSelect(sensor.id)}
            class="w-full px-3 py-2 flex items-center gap-2 text-left transition-colors focus:outline-none {isHighlighted
              ? 'bg-[var(--theme-primary)]/10'
              : 'hover:bg-[var(--theme-surface)]'}"
          >
            {#if favoriteIds.includes(sensor.id)}
              <Star size={14} class="text-[var(--theme-warning)] shrink-0" />
            {:else}
              <span
                class="w-2 h-2 rounded-full bg-[var(--theme-primary)] shrink-0"
              ></span>
            {/if}
            <div class="flex-1 min-w-0">
              <div class="text-sm text-[var(--theme-text)] truncate">
                {sensor.name}
              </div>
              <div class="text-xs text-[var(--theme-text-muted)] truncate">
                {sensor.category} · {sensor.source}
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-mono text-[var(--theme-text)]">
                {formatValue(currentData?.value)}
              </div>
              <div class="text-xs text-[var(--theme-text-muted)]">
                {sensor.unit}
              </div>
            </div>
            {#if isSelected}
              <Check size={16} class="text-[var(--theme-success)] shrink-0" />
            {/if}
          </button>
        {/each}
      {/each}
    {/if}
  </div>
</div>
