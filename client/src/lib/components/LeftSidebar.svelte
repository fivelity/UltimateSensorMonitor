<script lang="ts">
  import { availableSensors, sensorData, widgetUtils } from "$lib/stores";
  import type {
    GaugeType,
    SensorInfo,
    StyleSettings,
    WidgetConfig,
  } from "$lib/types";
  import {
    ChevronDown,
    ChevronRight,
    Cpu,
    Gauge,
    Plus,
    Thermometer,
    X,
    Zap,
  } from "@lucide/svelte";

  const { onclose }: { onclose?: () => void } = $props();

  // Accordion state - track which category is expanded
  let expandedCategory: string | null = $state(null);

  // Group sensors by category
  const sensorsByCategory = $derived(
    $availableSensors.reduce(
      (acc, sensor) => {
        if (!acc[sensor.category]) {
          acc[sensor.category] = [];
        }
        acc[sensor.category].push(sensor);
        return acc;
      },
      {} as Record<string, SensorInfo[]>,
    ),
  );

  // Category icons
  const categoryIcons = {
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
    return (
      categoryIcons[category as keyof typeof categoryIcons] ||
      categoryIcons.default
    );
  }

  function toggleCategory(category: string) {
    expandedCategory = expandedCategory === category ? null : category;
  }

  function createWidget(sensor: SensorInfo, gaugeType: GaugeType = "text") {
    const widget: WidgetConfig = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sensor_id: sensor.id,
      gauge_type: gaugeType,
      pos_x: 100,
      pos_y: 100,
      width: 200,
      height: 120,
      rotation: 0,
      z_index: 0,
      is_locked: false,
      show_label: true,
      show_unit: true,
      gauge_settings: {},
      style_settings: {} as StyleSettings,
    };

    widgetUtils.addWidget(widget);
  }

  function formatValue(value: number | string | undefined): string {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "--";
  }

  // Function to find and highlight a sensor in the sidebar
  export function findSensorInSidebar(sensorId: string) {
    // Find which category contains this sensor
    const sensor = $availableSensors.find((s) => s.id === sensorId);
    if (sensor) {
      // Expand the category
      expandedCategory = sensor.category;

      // Scroll to the sensor after a short delay to allow accordion to expand
      setTimeout(() => {
        const sensorElement = document.querySelector(
          `[data-sensor-id="${sensorId}"]`,
        );
        if (sensorElement) {
          sensorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a temporary highlight effect
          sensorElement.classList.add("highlight-sensor");
          setTimeout(() => {
            sensorElement.classList.remove("highlight-sensor");
          }, 2000);
        }
      }, 300);
    }
  }

  const gaugeTypeOptions: {
    type: GaugeType;
    label: string;
    token: "primary" | "secondary" | "accent" | "text-muted";
  }[] = [
    { type: "text", label: "Text", token: "primary" },
    { type: "radial", label: "Radial", token: "secondary" },
    { type: "linear", label: "Linear", token: "accent" },
    { type: "graph", label: "Graph", token: "text-muted" },
    { type: "image", label: "Image", token: "text-muted" },
  ];

  function tokenClass(token: string): string {
    return `bg-[var(--theme-${token})] text-[var(--theme-background)] hover:opacity-90`;
  }
</script>

<div class="sidebar-content h-full flex flex-col bg-[var(--theme-surface)]">
  <!-- Header -->
  <div
    class="flex items-center justify-between p-4 border-b border-[var(--theme-border)]"
  >
    <h2 class="font-semibold text-[var(--theme-text)]">Sensors & Widgets</h2>
    <button
      class="p-1 rounded hover:bg-[var(--theme-background)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
      onclick={() => onclose?.()}
      title="Close panel"
      aria-label="Close panel"
    >
      <X size={16} />
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    <!-- Sensors by Category (Accordion) -->
    {#each Object.entries(sensorsByCategory) as [category, sensors]}
      {@const ChevronIcon =
        expandedCategory === category ? ChevronDown : ChevronRight}
      {@const CategoryIcon = getCategoryIcon(category)}
      <div class="border-b border-[var(--theme-border)]">
        <!-- Category Header (Clickable) -->
        <button
          class="w-full p-4 flex items-center gap-2 hover:bg-[var(--theme-background)] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary)]"
          onclick={() => toggleCategory(category)}
        >
          <ChevronIcon
            size={16}
            class="text-[var(--theme-text-muted)] transition-transform"
          />
          <CategoryIcon size={16} class="text-[var(--theme-primary)]" />
          <h3 class="font-medium text-[var(--theme-text)] capitalize flex-1">
            {category.replace("_", " ")}
          </h3>
          <span class="text-sm text-[var(--theme-text-muted)]">
            ({sensors.length})
          </span>
        </button>

        <!-- Sensor List (Collapsible) -->
        {#if expandedCategory === category}
          <div class="px-4 pb-4 space-y-2">
            {#each sensors as sensor}
              {@const currentData = $sensorData[sensor.id]}
              <div
                class="sensor-item p-3 rounded-lg bg-[var(--theme-background)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)] transition-colors group"
                data-sensor-id={sensor.id}
              >
                <!-- Sensor Info -->
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="font-medium text-sm text-[var(--theme-text)]">
                      {sensor.name}
                    </div>
                    <div class="text-xs text-[var(--theme-text-muted)]">
                      {sensor.id}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-mono text-sm text-[var(--theme-text)]">
                      {formatValue(currentData?.value)}
                    </div>
                    <div class="text-xs text-[var(--theme-text-muted)]">
                      {sensor.unit}
                    </div>
                  </div>
                </div>

                <!-- Range indicator (if available) -->
                {#if sensor.min_value !== undefined && sensor.max_value !== undefined && typeof currentData?.value === "number"}
                  {@const percentage = Math.min(
                    100,
                    Math.max(
                      0,
                      ((currentData.value - sensor.min_value) /
                        (sensor.max_value - sensor.min_value)) *
                        100,
                    ),
                  )}
                  <div class="mb-2">
                    <div
                      class="w-full bg-[var(--theme-border)] rounded-full h-1.5"
                    >
                      <div
                        class="bg-[var(--theme-primary)] h-1.5 rounded-full transition-all duration-300"
                        style="width: {percentage}%"
                      ></div>
                    </div>
                    <div
                      class="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1"
                    >
                      <span>{sensor.min_value}</span>
                      <span>{sensor.max_value}</span>
                    </div>
                  </div>
                {/if}

                <!-- Quick Add Buttons -->
                <div
                  class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap"
                >
                  {#each gaugeTypeOptions as option}
                    <button
                      class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-1 focus:ring-offset-[var(--theme-background)] {tokenClass(
                        option.token,
                      )}"
                      onclick={() => createWidget(sensor, option.type)}
                      title="Add as {option.label} widget"
                    >
                      <Plus size={12} />
                      {option.label}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    <!-- Empty State -->
    {#if Object.keys(sensorsByCategory).length === 0}
      <div class="p-8 text-center text-[var(--theme-text-muted)]">
        <Gauge size={48} class="mx-auto mb-4 opacity-50" />
        <p>No sensors available</p>
        <p class="text-sm mt-2">Check your connection and try again</p>
      </div>
    {/if}
  </div>
</div>

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
