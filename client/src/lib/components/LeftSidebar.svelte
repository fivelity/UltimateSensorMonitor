<script lang="ts">
  import {
    gaugeTypeMetadata,
    getDefaultGaugeType,
  } from "$lib/constants/gauges";
  import {
    availableSensors,
    inspectorStore,
    sensorData,
    visualSettings,
    widgetUtils,
  } from "$lib/stores";
  import { AddWidgetCommand, historyStore } from "$lib/stores/history";
  import type {
    GaugeType,
    SensorInfo,
    StyleSettings,
    WidgetConfig,
  } from "$lib/types";
  import { snapToGrid } from "$lib/utils/geometry";
  import {
    ChevronDown,
    ChevronRight,
    Cpu,
    Gauge,
    GripVertical,
    Plus,
    Sparkles,
    Star,
    Thermometer,
    X,
    Zap,
  } from "@lucide/svelte";
  import { get } from "svelte/store";
  import SearchInput from "./SearchInput.svelte";
  import SensorAddPopover from "./SensorAddPopover.svelte";

  const {
    onclose,
    onopenWizard,
  }: {
    onclose?: () => void;
    onopenWizard?: () => void;
  } = $props();

  // Sensor inventory search
  let searchQuery = $state("");
  // Track expanded categories by name
  let expandedCategories = $state<Record<string, boolean>>({});
  // Track popover state
  let activePopoverSensor = $state<SensorInfo | null>(null);
  let activePopoverRect = $state<DOMRect | null>(null);
  // Wizard visibility - deferred to Phase C

  const lowerQuery = $derived(searchQuery.toLowerCase().trim());
  const favoriteIds = $derived($inspectorStore.favoriteSensors);
  const recentIds = $derived($inspectorStore.recentSensors);

  const favoriteSensors = $derived(
    $availableSensors.filter((s) => favoriteIds.includes(s.id)),
  );
  const recentSensors = $derived(
    $availableSensors.filter(
      (s) => recentIds.includes(s.id) && !favoriteIds.includes(s.id),
    ),
  );

  const categoryIcons: Record<string, typeof Gauge> = {
    temperature: Thermometer,
    usage: Gauge,
    load: Gauge,
    power: Zap,
    frequency: Cpu,
    clock: Cpu,
    fan: Gauge,
    voltage: Zap,
    memory: Cpu,
    throughput: Gauge,
    default: Gauge,
  };

  function getCategoryIcon(category: string) {
    return categoryIcons[category] || categoryIcons.default;
  }

  function toggleCategory(category: string) {
    expandedCategories = {
      ...expandedCategories,
      [category]: !expandedCategories[category],
    };
  }

  function ensureCategoryExpanded(category: string) {
    if (!expandedCategories[category]) {
      expandedCategories = { ...expandedCategories, [category]: true };
    }
  }

  function filterSensors(sensors: SensorInfo[]) {
    if (lowerQuery.length === 0) return sensors;
    return sensors.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.category.toLowerCase().includes(lowerQuery) ||
        s.source.toLowerCase().includes(lowerQuery) ||
        s.unit.toLowerCase().includes(lowerQuery),
    );
  }

  const sensorsByCategory = $derived(() => {
    const remaining = $availableSensors.filter(
      (s) => !favoriteIds.includes(s.id) && !recentIds.includes(s.id),
    );
    const filtered = filterSensors(remaining);
    return filtered.reduce(
      (acc, sensor) => {
        if (!acc[sensor.category]) acc[sensor.category] = [];
        acc[sensor.category].push(sensor);
        return acc;
      },
      {} as Record<string, SensorInfo[]>,
    );
  });

  const categoryEntries = $derived(Object.entries(sensorsByCategory()));

  // Auto-collapse categories with no matches when filtering
  $effect(() => {
    if (lowerQuery.length > 0) {
      const nextExpanded = { ...expandedCategories };
      categoryEntries.forEach(([category, sensors]) => {
        if (sensors.length > 0) {
          nextExpanded[category] = true;
        }
      });
      expandedCategories = nextExpanded;
    }
  });

  function formatValue(value: number | string | undefined): string {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "--";
  }

  function recordSensorUse(sensorId: string) {
    inspectorStore.addRecentSensor(sensorId);
  }

  export function getDefaultWidgetPosition(): { x: number; y: number } {
    // Center in viewport with a small random offset to avoid stacking
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    return {
      x: Math.max(
        0,
        Math.round(viewportWidth / 2 - 100 + Math.random() * 40 - 20),
      ),
      y: Math.max(
        0,
        Math.round(viewportHeight / 2 - 60 + Math.random() * 40 - 20),
      ),
    };
  }

  function createWidget(
    sensor: SensorInfo,
    gaugeType: GaugeType = getDefaultGaugeType(sensor.category),
    position: { x: number; y: number } | undefined = undefined,
  ) {
    const pos = position !== undefined ? position : getDefaultWidgetPosition();
    const meta = gaugeTypeMetadata[gaugeType];
    const size = { width: meta.defaultWidth, height: meta.defaultHeight };

    // Unified canvas: snap to grid when snap is enabled in visual settings
    const settings = get(visualSettings);
    if (settings.snap_to_grid && settings.grid_size > 0) {
      pos.x = snapToGrid(pos.x, settings.grid_size);
      pos.y = snapToGrid(pos.y, settings.grid_size);
      size.width = snapToGrid(size.width, settings.grid_size);
      size.height = snapToGrid(size.height, settings.grid_size);
    }

    const widget: WidgetConfig = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sensor_id: sensor.id,
      gauge_type: gaugeType,
      pos_x: pos.x,
      pos_y: pos.y,
      width: size.width,
      height: size.height,
      rotation: 0,
      z_index: 1,
      is_locked: false,
      show_label: true,
      show_unit: true,
      gauge_settings: { ...gaugeTypeMetadata[gaugeType].defaultSettings },
      style_settings: {} as StyleSettings,
    };

    historyStore.executeCommand(
      new AddWidgetCommand(
        widget,
        widgetUtils.addWidget,
        widgetUtils.removeWidget,
      ),
    );

    recordSensorUse(sensor.id);
  }

  function handleQuickAddClick(event: MouseEvent, sensor: SensorInfo) {
    const target = event.currentTarget as HTMLElement;
    activePopoverSensor = sensor;
    activePopoverRect = target.getBoundingClientRect();
  }

  function handlePopoverCreate(sensor: SensorInfo, gaugeType: GaugeType) {
    createWidget(sensor, gaugeType);
    activePopoverSensor = null;
    activePopoverRect = null;
  }

  function handleDragStart(event: DragEvent, sensor: SensorInfo) {
    if (!event.dataTransfer) return;
    const gaugeType = getDefaultGaugeType(sensor.category);
    event.dataTransfer.setData("sensorId", sensor.id);
    event.dataTransfer.setData("gaugeType", gaugeType);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleToggleFavorite(event: MouseEvent, sensor: SensorInfo) {
    event.stopPropagation();
    inspectorStore.toggleFavoriteSensor(sensor.id);
  }

  export function findSensorInSidebar(sensorId: string) {
    const sensor = $availableSensors.find((s) => s.id === sensorId);
    if (!sensor) return;

    searchQuery = "";
    ensureCategoryExpanded(sensor.category);

    setTimeout(() => {
      const sensorElement = document.querySelector(
        `[data-sensor-id="${sensorId}"]`,
      );
      if (sensorElement) {
        sensorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        sensorElement.classList.add("highlight-sensor");
        setTimeout(() => {
          sensorElement.classList.remove("highlight-sensor");
        }, 2000);
      }
    }, 300);
  }
</script>

<div
  class="sidebar-content glass-panel h-full flex flex-col rounded-r-2xl border-r border-y border-[var(--glass-border)]"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between p-4 border-b border-[var(--glass-border)]"
  >
    <h2 class="font-semibold text-[var(--theme-text)]">Sensor Inventory</h2>
    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={() => onopenWizard?.()}
        class="p-1.5 rounded-lg hover:bg-white/10 text-[var(--theme-primary)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        title="Add widget wizard"
        aria-label="Add widget wizard"
      >
        <Sparkles size={16} />
      </button>
      <button
        type="button"
        onclick={() => onclose?.()}
        class="p-1.5 rounded-lg hover:bg-white/10 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        title="Close panel"
        aria-label="Close panel"
      >
        <X size={16} />
      </button>
    </div>
  </div>

  <!-- Search -->
  <div class="p-3 border-b border-[var(--theme-border)]">
    <SearchInput
      value={searchQuery}
      placeholder="Search sensors by name, category, source, unit..."
      onchange={(value) => (searchQuery = value)}
      onclear={() => (searchQuery = "")}
    />
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-3 space-y-3">
    <!-- Favorites -->
    {#if favoriteSensors.length > 0}
      {@const sensors = filterSensors(favoriteSensors)}
      {#if sensors.length > 0}
        <div>
          <button
            type="button"
            onclick={() => {}}
            class="w-full flex items-center gap-2 mb-2 text-left"
          >
            <Star size={14} class="text-[var(--theme-warning)]" />
            <span class="text-sm font-medium text-[var(--theme-text)]"
              >Favorites</span
            >
            <span class="text-xs text-[var(--theme-text-muted)]"
              >({sensors.length})</span
            >
          </button>
          <div class="space-y-2">
            {#each sensors as sensor}
              {@render sensorRow(sensor)}
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Recent -->
    {#if recentSensors.length > 0}
      {@const sensors = filterSensors(recentSensors)}
      {#if sensors.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-medium text-[var(--theme-text)]"
              >Recently Used</span
            >
            <span class="text-xs text-[var(--theme-text-muted)]"
              >({sensors.length})</span
            >
          </div>
          <div class="space-y-2">
            {#each sensors as sensor}
              {@render sensorRow(sensor)}
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Categories -->
    {#each categoryEntries as [category, sensors]}
      {@const ChevronIcon = expandedCategories[category]
        ? ChevronDown
        : ChevronRight}
      {@const CategoryIcon = getCategoryIcon(category)}
      <div
        class="border border-[var(--theme-border)] rounded-lg overflow-hidden"
      >
        <button
          type="button"
          class="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--theme-background)] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary)]"
          onclick={() => toggleCategory(category)}
        >
          <ChevronIcon
            size={16}
            class="text-[var(--theme-text-muted)] transition-transform"
          />
          <CategoryIcon size={16} class="text-[var(--theme-primary)]" />
          <h3
            class="font-medium text-sm text-[var(--theme-text)] capitalize flex-1"
          >
            {category.replace("_", " ")}
          </h3>
          <span class="text-xs text-[var(--theme-text-muted)]">
            ({sensors.length})
          </span>
        </button>

        {#if expandedCategories[category]}
          <div class="px-2 pb-2 space-y-2 bg-[var(--theme-background)]/50">
            {#each sensors as sensor}
              {@render sensorRow(sensor)}
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    <!-- Empty State -->
    {#if categoryEntries.length === 0 && favoriteSensors.length === 0 && recentSensors.length === 0}
      <div class="p-8 text-center text-[var(--theme-text-muted)]">
        <Gauge size={48} class="mx-auto mb-4 opacity-50" />
        <p>No sensors available</p>
        <p class="text-sm mt-2">Check your connection and try again</p>
      </div>
    {:else if categoryEntries.length === 0 && filterSensors(favoriteSensors).length === 0 && filterSensors(recentSensors).length === 0}
      <div class="p-8 text-center text-[var(--theme-text-muted)]">
        <p>No sensors match your search</p>
      </div>
    {/if}
  </div>
</div>

{#snippet sensorRow(sensor: SensorInfo)}
  {@const currentData = $sensorData[sensor.id]}
  {@const isFavorite = favoriteIds.includes(sensor.id)}
  <div
    class="sensor-item p-2 rounded-lg bg-[var(--theme-background)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)] transition-colors group cursor-grab active:cursor-grabbing"
    data-sensor-id={sensor.id}
    draggable="true"
    ondragstart={(e) => handleDragStart(e, sensor)}
    tabindex="0"
    role="button"
    aria-label="Drag {sensor.name} to canvas"
    title="Drag to canvas"
  >
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={(e) => handleToggleFavorite(e, sensor)}
        class="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-warning)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          size={14}
          class={isFavorite
            ? "fill-[var(--theme-warning)] text-[var(--theme-warning)]"
            : ""}
        />
      </button>

      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm text-[var(--theme-text)] truncate">
          {sensor.name}
        </div>
        <div class="text-xs text-[var(--theme-text-muted)] truncate">
          {sensor.category} · {sensor.unit}
        </div>
      </div>

      <div class="text-right shrink-0">
        <div class="font-mono text-sm text-[var(--theme-text)]">
          {formatValue(currentData?.value)}
        </div>
      </div>

      <button
        type="button"
        onclick={(e) => handleQuickAddClick(e, sensor)}
        class="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] opacity-0 group-hover:opacity-100"
        title="Quick add widget"
        aria-label="Quick add widget for {sensor.name}"
      >
        <Plus size={14} />
      </button>

      <div class="text-[var(--theme-text-muted)] cursor-grab">
        <GripVertical size={14} />
      </div>
    </div>
  </div>
{/snippet}

{#if activePopoverSensor && activePopoverRect}
  <SensorAddPopover
    sensor={activePopoverSensor}
    anchorRect={activePopoverRect}
    oncreate={handlePopoverCreate}
    onclose={() => {
      activePopoverSensor = null;
      activePopoverRect = null;
    }}
  />
{/if}

<style>
  :global(.sensor-item.highlight-sensor) {
    border-color: var(--theme-accent);
    background-color: rgba(var(--theme-accent-rgb), 0.1);
    animation: highlight-pulse 2s ease-in-out;
  }

  @keyframes highlight-pulse {
    0%,
    100% {
      border-color: var(--theme-border);
      background-color: var(--theme-background);
    }
    50% {
      border-color: var(--theme-accent);
      background-color: rgba(var(--theme-accent-rgb), 0.15);
    }
  }
</style>
