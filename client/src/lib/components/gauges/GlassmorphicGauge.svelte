<script lang="ts">
  import type { WidgetConfig, SensorData } from '$lib/types';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  // Gauge settings with defaults
  const glow_intensity = $derived(widget.gauge_settings.glow_intensity || 0.5);
  const blur_level = $derived(widget.gauge_settings.blur_level || 0.3);
  const transparency = $derived(widget.gauge_settings.transparency || 0.8);
  const gauge_style = $derived(widget.gauge_settings.style || 'radial'); // 'radial' | 'linear' | 'ring'

  // Data processing
  const sensorName = $derived(widget.custom_label || sensorData?.name || 'Unknown Sensor');
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');
  const displayValue = $derived(sensorData?.value ?? '--');
  const minValue = $derived(widget.gauge_settings.min_value || sensorData?.min_value || 0);
  const maxValue = $derived(widget.gauge_settings.max_value || sensorData?.max_value || 100);

  // Calculate normalized value (0-1)
  const normalizedValue = $derived(
    typeof displayValue === 'number'
      ? Math.max(0, Math.min(1, (displayValue - minValue) / (maxValue - minValue)))
      : 0
  );

  // Calculate percentage for display
  const percentageValue = $derived(Math.round(normalizedValue * 100));

  // Dynamic styling based on value
  const valueColor = $derived(getValueColor(normalizedValue));
  const glowColor = $derived(getGlowColor(normalizedValue));

  function getValueColor(value: number): string {
    if (value < 0.3) return '#10b981'; // Green
    if (value < 0.7) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  function getGlowColor(value: number): string {
    if (value < 0.3) return '16, 185, 129'; // Green RGB
    if (value < 0.7) return '245, 158, 11'; // Yellow RGB
    return '239, 68, 68'; // Red RGB
  }

  // Animation values
  let animationProgress = $state(0);

  $effect(() => {
    // Animate to current value on mount
    let mountedValue = 0;
    const animate = () => {
      if (mountedValue < normalizedValue) {
        mountedValue = Math.min(mountedValue + 0.02, normalizedValue);
        animationProgress = mountedValue;
        requestAnimationFrame(animate);
      } else {
        animationProgress = normalizedValue;
      }
    };
    animate();
  });

  // Update animation when value changes
  $effect(() => {
    if (typeof normalizedValue === 'number') {
      const targetValue = normalizedValue;
      const currentValue = animationProgress;
      const diff = targetValue - currentValue;

      if (Math.abs(diff) > 0.01) {
        const animate = () => {
          const step = diff * 0.1;
          animationProgress += step;

          if (Math.abs(targetValue - animationProgress) > 0.01) {
            requestAnimationFrame(animate);
          } else {
            animationProgress = targetValue;
          }
        };
        animate();
      }
    }
  });
</script>

<div class="glassmorphic-gauge" class:show-blur={blur_level > 0}>
  <!-- Background Glass Effect -->
  <div
    class="glass-background"
    style="
      backdrop-filter: blur({blur_level * 20}px);
      background: rgba(255, 255, 255, {transparency * 0.1});
      border: 1px solid rgba(255, 255, 255, {transparency * 0.2});
    "
  ></div>

  <!-- Title -->
  {#if widget.show_label}
    <div class="gauge-title">
      {sensorName}
    </div>
  {/if}

  <!-- Main Gauge Content -->
  <div class="gauge-content">
    {#if gauge_style === 'radial'}
      <!-- Radial Gauge -->
      <div class="radial-gauge">
        <svg viewBox="0 0 120 120" class="gauge-svg">
          <!-- Background Arc -->
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            stroke-width="8"
            stroke-linecap="round"
          />

          <!-- Progress Arc -->
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={valueColor}
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="283"
            stroke-dashoffset={283 - (283 * animationProgress)}
            transform="rotate(-90 60 60)"
            style="
              filter: drop-shadow(0 0 {glow_intensity * 10}px rgba({glowColor}, {glow_intensity}));
              transition: stroke-dashoffset 0.3s ease;
            "
          />

          <!-- Center Glow -->
          <circle
            cx="60"
            cy="60"
            r="25"
            fill="rgba({glowColor}, {glow_intensity * 0.1})"
            style="filter: blur({blur_level * 5}px);"
          />
        </svg>

        <!-- Center Value -->
        <div class="center-value">
          <div class="value-text" style="color: {valueColor};">
            {displayValue}
          </div>
          {#if widget.show_unit && unit}
            <div class="unit-text">
              {unit}
            </div>
          {/if}
        </div>
      </div>

    {:else if gauge_style === 'linear'}
      <!-- Linear Gauge -->
      <div class="linear-gauge">
        <div class="linear-track">
          <div
            class="linear-progress"
            style="
              width: {animationProgress * 100}%;
              background: linear-gradient(90deg, {valueColor} 0%, rgba({glowColor}, 0.8) 100%);
              box-shadow: 0 0 {glow_intensity * 15}px rgba({glowColor}, {glow_intensity});
            "
          ></div>
        </div>

        <div class="linear-value">
          <span class="value-text" style="color: {valueColor};">
            {displayValue}
          </span>
          {#if widget.show_unit && unit}
            <span class="unit-text">{unit}</span>
          {/if}
        </div>
      </div>

    {:else if gauge_style === 'ring'}
      <!-- Ring Gauge -->
      <div class="ring-gauge">
        <div class="ring-container">
          <!-- Outer Ring -->
          <div
            class="ring-outer"
            style="
              background: conic-gradient(
                from 0deg,
                {valueColor} 0deg,
                {valueColor} {animationProgress * 360}deg,
                rgba(255, 255, 255, 0.1) {animationProgress * 360}deg,
                rgba(255, 255, 255, 0.1) 360deg
              );
              filter: blur({blur_level * 2}px) drop-shadow(0 0 {glow_intensity * 8}px rgba({glowColor}, {glow_intensity}));
            "
          ></div>

          <!-- Inner Content -->
          <div class="ring-inner">
            <div class="ring-value">
              <div class="value-text" style="color: {valueColor};">
                {percentageValue}%
              </div>
              <div class="sensor-name">
                {sensorName}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Info -->
  <div class="gauge-info">
    <div class="info-item">
      <span class="info-label">Min</span>
      <span class="info-value">{minValue}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Max</span>
      <span class="info-value">{maxValue}</span>
    </div>
  </div>

  <!-- Floating Particles Effect -->
  {#if glow_intensity > 0.7}
    <div class="particles">
      {#each Array(6) as _particle, i}
        <div
          class="particle"
          style="
            animation-delay: {i * 0.3}s;
            background: radial-gradient(circle, rgba({glowColor}, 0.8) 0%, transparent 70%);
          "
        ></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .glassmorphic-gauge {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 12px;
    font-family: var(--theme-font-family, 'Inter');
  }

  .glass-background {
    position: absolute;
    inset: 0;
    border-radius: 16px;
    z-index: -1;
    transition: all 0.3s ease;
  }

  .gauge-title {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 8px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .gauge-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Radial Gauge Styles */
  .radial-gauge {
    position: relative;
    width: 100%;
    max-width: 120px;
    aspect-ratio: 1;
  }

  .gauge-svg {
    width: 100%;
    height: 100%;
  }

  .center-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .value-text {
    font-size: 1.25rem;
    font-weight: 700;
    text-shadow: 0 0 10px currentColor;
    margin-bottom: 2px;
  }

  .unit-text {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  /* Linear Gauge Styles */
  .linear-gauge {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .linear-track {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .linear-progress {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease, box-shadow 0.3s ease;
    position: relative;
  }

  .linear-value {
    text-align: center;
  }

  /* Ring Gauge Styles */
  .ring-gauge {
    width: 100%;
    max-width: 100px;
    aspect-ratio: 1;
  }

  .ring-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .ring-outer {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    transition: all 0.5s ease;
  }

  .ring-inner {
    position: absolute;
    top: 20%;
    left: 20%;
    width: 60%;
    height: 60%;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
  }

  .ring-value {
    text-align: center;
  }

  .sensor-name {
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 2px;
  }

  /* Bottom Info */
  .gauge-info {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .info-label {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .info-value {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  /* Particle Effects */
  .particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: 16px;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    opacity: 0;
    animation: float 3s infinite ease-in-out;
  }

  .particle:nth-child(1) { top: 20%; left: 10%; }
  .particle:nth-child(2) { top: 40%; right: 15%; }
  .particle:nth-child(3) { bottom: 30%; left: 20%; }
  .particle:nth-child(4) { top: 60%; left: 50%; }
  .particle:nth-child(5) { bottom: 20%; right: 25%; }
  .particle:nth-child(6) { top: 15%; left: 70%; }

  @keyframes float {
    0%, 100% {
      opacity: 0;
      transform: translateY(0px) scale(0.5);
    }
    50% {
      opacity: 0.8;
      transform: translateY(-20px) scale(1);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .value-text {
      font-size: 1rem;
    }

    .gauge-title {
      font-size: 0.7rem;
    }
  }
</style>
