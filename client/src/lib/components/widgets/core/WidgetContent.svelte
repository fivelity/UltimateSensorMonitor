<script lang="ts">
  import { sensorData, availableSensors } from '$lib/stores';
  import type { WidgetConfig, SensorData } from '$lib/types';

  // Import gauge components from existing location
  import TextGauge from '$lib/components/gauges/TextGauge.svelte';
  import RadialGauge from '$lib/components/gauges/RadialGauge.svelte';
  import LinearGauge from '$lib/components/gauges/LinearGauge.svelte';
  import GraphGauge from '$lib/components/gauges/GraphGauge.svelte';
  import ImageSequenceGauge from '$lib/components/gauges/ImageSequenceGauge.svelte';
  import GlassmorphicGauge from '$lib/components/gauges/GlassmorphicGauge.svelte';

  const { widget }: { widget: WidgetConfig } = $props();

  // Get current sensor data for this widget
  const currentSensorData = $derived($sensorData[widget.sensor_id] as SensorData | undefined);
  const sensorInfo = $derived($availableSensors.find(s => s.id === widget.sensor_id));

  // Fallback to sensor info if current data is not available
  const displayData = $derived(currentSensorData || sensorInfo);

  // Debug logging when configured
  $effect(() => {
    if (widget.id) {
      console.log(`[WidgetContent ${widget.id}] Sensor: ${widget.sensor_id}, Data:`, displayData, 'Gauge:', widget.gauge_type);
    }
  });
</script>

<div class="widget-content w-full h-full overflow-hidden">
  {#if displayData}
    {#if widget.gauge_type === 'text'}
      <TextGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === 'radial'}
      <RadialGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === 'linear'}
      <LinearGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === 'graph'}
      <GraphGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === 'image'}
      <ImageSequenceGauge {widget} sensorData={displayData} />
    {:else if widget.gauge_type === 'glassmorphic'}
      <GlassmorphicGauge {widget} sensorData={displayData} />
    {:else}
      <!-- Fallback for unknown gauge types -->
      <div class="flex items-center justify-center h-full text-center p-4">
        <div class="text-[var(--theme-text-muted)]">
          <div class="text-2xl mb-2">⚠️</div>
          <div class="text-sm">Unknown gauge type: {widget.gauge_type}</div>
        </div>
      </div>
    {/if}
  {:else}
    <!-- No data state -->
    <div class="flex items-center justify-center h-full text-center p-4">
      <div class="text-[var(--theme-text-muted)]">
        <div class="text-2xl mb-2">📊</div>
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
