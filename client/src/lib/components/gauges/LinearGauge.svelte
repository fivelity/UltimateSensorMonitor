<script lang="ts">
  import type { WidgetConfig, SensorData } from '$lib/types';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  // Get display value and calculate percentage
  const value = $derived(typeof sensorData?.value === 'number' ? sensorData.value : 0);
  const minValue = $derived(sensorData?.min_value ?? 0);
  const maxValue = $derived(sensorData?.max_value ?? 100);
  const percentage = $derived(isFinite(value) && isFinite(minValue) && isFinite(maxValue) && (maxValue !== minValue)
    ? Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100))
    : null);
  
  // Gauge settings with defaults
  const orientation = $derived(widget.gauge_settings?.orientation ?? 'horizontal');
  const showScale = $derived(widget.gauge_settings?.show_scale ?? true);
  const primaryColor = $derived(widget.gauge_settings?.color_primary ?? 'var(--theme-primary)');
  const secondaryColor = $derived(widget.gauge_settings?.color_secondary ?? 'var(--theme-secondary)');

  // Format display value
  const formattedValue = $derived(typeof value === 'number' ? (Number.isInteger(value) ? value.toString() : value.toFixed(1)) : '--');
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');
  
  // Calculate dimensions based on orientation
  const isHorizontal = $derived(orientation === 'horizontal');
  const barThickness = $derived(isHorizontal ? Math.min(widget.height / 3, 20) : Math.min(widget.width / 3, 20));
</script>

<div class="gauge-container">
  <div class="flex {isHorizontal ? 'flex-col' : 'flex-row'} h-full justify-center items-center gap-2">
    
    <!-- Value Display -->
    <div class="text-center {isHorizontal ? 'mb-2' : 'mr-2'}">
      <div class="font-bold text-[var(--theme-text)] text-lg">
        {formattedValue}
      </div>
      {#if unit}
        <div class="text-sm text-[var(--theme-text-muted)] opacity-75">
          {unit}
        </div>
      {/if}
    </div>

    <!-- Progress Bar -->
    <div class="flex-1 {isHorizontal ? 'w-full' : 'h-full'} relative">
      {#if percentage !== null && isFinite(percentage)}
        <div 
          class="
            {isHorizontal ? 'w-full' : 'h-full'} 
            bg-[var(--theme-surface)] 
            rounded-full 
            overflow-hidden
            border border-[var(--theme-border)]
          "
          style="
            {isHorizontal ? `height: ${barThickness}px;` : `width: ${barThickness}px;`}
          "
        >
          <!-- Progress fill -->
          <div 
            class="
              {isHorizontal ? 'h-full' : 'w-full'} 
              rounded-full 
              transition-all 
              duration-300 
              ease-out
            "
            style="
              background: linear-gradient(
                {isHorizontal ? '90deg' : '0deg'}, 
                {primaryColor}, 
                {secondaryColor}
              );
              {isHorizontal 
                ? `width: ${percentage}%;` 
                : `height: ${percentage}%; margin-top: auto;`
              }
            "
          ></div>
        </div>

        <!-- Scale markers (if enabled) -->
        {#if showScale}
          <div class="absolute {isHorizontal ? 'top-full mt-1 left-0 right-0' : 'left-full ml-1 top-0 bottom-0'}">
            <div class="
              {isHorizontal ? 'flex justify-between' : 'flex flex-col justify-between h-full'} 
              text-xs text-[var(--theme-text-muted)] opacity-60
            ">
              <span>{minValue}</span>
              <span>{maxValue}</span>
            </div>
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-center w-full h-full text-[var(--theme-text-muted)] opacity-60" style="font-size: 1.2rem;">
          --
        </div>
      {/if}
    </div>

    <!-- Percentage indicator -->
    <div class="text-center {isHorizontal ? 'mt-2' : 'ml-2'}">
      <div class="text-sm text-[var(--theme-text-muted)] opacity-75">
        {percentage !== null ? percentage.toFixed(0) : '--'}%
      </div>
    </div>
  </div>
</div>

<style>
  .gauge-container {
    width: 100%;
    height: 100%;
    padding: 12px;
    background: var(--theme-surface);
    border-radius: 0.75rem; /* 12px */
    font-family: var(--font-family, sans-serif);
  }
  /* Ensure child text elements inherit the font by default */
  .gauge-container :global(div),
  .gauge-container :global(span) {
    font-family: inherit;
  }
</style>
