<script lang="ts">
  import { availableSensors, sensorData } from "$lib/stores";
  import type { SensorData, WidgetConfig } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import { AlertTriangle, BarChart3 } from "@lucide/svelte";
  // Import gauge components from existing location
  import GlassmorphicGauge from "$lib/components/gauges/GlassmorphicGauge.svelte";
  import GraphGauge from "$lib/components/gauges/GraphGauge.svelte";
  import ImageSequenceGauge from "$lib/components/gauges/ImageSequenceGauge.svelte";
  import LinearGauge from "$lib/components/gauges/LinearGauge.svelte";
  import RadialGauge from "$lib/components/gauges/RadialGauge.svelte";
  import TextGauge from "$lib/components/gauges/TextGauge.svelte";

  const { widget }: { widget: WidgetConfig } = $props();

  // Get current sensor data for this widget
  const currentSensorData = $derived(
    $sensorData[widget.sensor_id] as SensorData | undefined,
  );
  const sensorInfo = $derived(
    $availableSensors.find((s) => s.id === widget.sensor_id),
  );

  // Use live sensor data; fall back to a stub built from static sensor info when no live data yet
  const displayData = $derived<SensorData | undefined>(
    currentSensorData ??
      (sensorInfo
        ? {
            id: sensorInfo.id,
            name: sensorInfo.name,
            value: "--",
            unit: sensorInfo.unit,
            source: sensorInfo.source,
            category: sensorInfo.category,
          }
        : undefined),
  );

  // Debug logging when configured
  $effect(() => {
    if (widget.id) {
      logger.debug(
        `[WidgetContent ${widget.id}] Sensor: ${widget.sensor_id}, Data:`,
        displayData,
        "Gauge:",
        widget.gauge_type,
      );
    }
  });
</script>

<div class="widget-content w-full h-full overflow-hidden">
  {#if displayData}
    {#if widget.gauge_type === "text"}
      <TextGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === "radial"}
      <RadialGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === "linear"}
      <LinearGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === "graph"}
      <GraphGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === "image"}
      <ImageSequenceGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === "glassmorphic"}
      <GlassmorphicGauge {widget} sensorData={displayData} />
    {:else}
      <!-- Fallback for unknown gauge types -->
      <div class="flex items-center justify-center h-full text-center p-4">
        <div class="text-[var(--theme-text-muted)]">
          <AlertTriangle size={32} class="mx-auto mb-2 opacity-70" />
          <div class="text-sm">Unknown gauge type: {widget.gauge_type}</div>
        </div>
      </div>
    {/if}
  {:else}
    <!-- No data state -->
    <div class="flex items-center justify-center h-full text-center p-4">
      <div class="text-[var(--theme-text-muted)]">
        <BarChart3 size={32} class="mx-auto mb-2 opacity-70" />
        <div class="text-sm">No sensor data</div>
        <div class="text-xs opacity-75">ID: {widget.sensor_id}</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .widget-content {
    position: relative;
    pointer-events: auto;
  }

  /* Ensure content doesn't interfere with widget interactions */
  .widget-content :global(*) {
    user-select: none;
  }

  /* Performance optimizations */
  .widget-content {
    contain: layout style;
    will-change: contents;
  }
</style>
