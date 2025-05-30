<script lang="ts">
  import type { WidgetConfig, SensorData } from '$lib/types';

  export let widget: WidgetConfig;
  export let sensorData: SensorData | undefined;

  // Get display value and calculate percentage
  $: value = typeof sensorData?.value === 'number' ? sensorData.value : 0;
  $: minValue = sensorData?.min_value ?? 0;
  $: maxValue = sensorData?.max_value ?? 100;
  $: percentage = Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100));
  
  // Gauge settings with defaults
  $: startAngle = widget.gauge_settings?.start_angle ?? -90;
  $: endAngle = widget.gauge_settings?.end_angle ?? 270;
  $: innerRadius = widget.gauge_settings?.inner_radius ?? 0.7;
  $: strokeWidth = widget.gauge_settings?.stroke_width ?? 8;
  $: primaryColor = widget.gauge_settings?.color_primary ?? 'var(--theme-primary)';
  $: secondaryColor = widget.gauge_settings?.color_secondary ?? 'var(--theme-border)';

  // Calculate gauge dimensions
  $: size = Math.min(widget.width - 32, widget.height - 32);
  $: radius = (size / 2) - (strokeWidth / 2);
  $: center = size / 2;
  
  // Calculate arc path
  $: arcLength = endAngle - startAngle;
  $: progressAngle = startAngle + (arcLength * percentage / 100);
  
  $: backgroundArc = describeArc(center, center, radius, startAngle, endAngle);
  $: progressArc = describeArc(center, center, radius, startAngle, progressAngle);

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  // Format display value
  $: formattedValue = typeof value === 'number' ? (Number.isInteger(value) ? value.toString() : value.toFixed(1)) : '--';
  $: unit = widget.custom_unit || sensorData?.unit || '';
  $: fontSize = Math.min(size / 8, 24);
</script>

<div class="gauge-container">
  <div class="relative flex items-center justify-center" style="width: {size}px; height: {size}px;">
    <!-- SVG Gauge -->
    <svg width={size} height={size} class="absolute">
      <!-- Background arc -->
      <path
        d={backgroundArc}
        fill="none"
        stroke={secondaryColor}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        opacity="0.3"
      />
      
      <!-- Progress arc -->
      <path
        d={progressArc}
        fill="none"
        stroke={primaryColor}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        class="transition-all duration-300 ease-out"
      />
    </svg>

    <!-- Center content -->
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
      <!-- Value -->
      <div 
        class="font-bold text-[var(--theme-text)]"
        style="font-size: {fontSize}px; line-height: 1;"
      >
        {formattedValue}
      </div>
      
      <!-- Unit -->
      {#if unit}
        <div 
          class="text-[var(--theme-text-muted)] opacity-75 mt-1"
          style="font-size: {fontSize * 0.5}px; line-height: 1;"
        >
          {unit}
        </div>
      {/if}
      
      <!-- Percentage -->
      <div 
        class="text-[var(--theme-text-muted)] opacity-60 mt-1"
        style="font-size: {fontSize * 0.4}px; line-height: 1;"
      >
        {percentage.toFixed(0)}%
      </div>
    </div>
  </div>
</div>

<style>
  .gauge-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
</style> 