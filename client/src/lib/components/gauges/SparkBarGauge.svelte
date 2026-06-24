<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { WidgetConfig, SensorData } from '$lib/types';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  // ── Sensor values ──────────────────────────────────────────────────────────
  const rawValue = $derived(typeof sensorData?.value === 'number' ? sensorData.value : null);
  const value = $derived(rawValue ?? 0);
  const minValue = $derived(widget.gauge_settings?.min_value ?? sensorData?.min_value ?? 0);
  const maxValue = $derived(widget.gauge_settings?.max_value ?? sensorData?.max_value ?? 100);
  const percentage = $derived(
    maxValue !== minValue
      ? Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100))
      : 0
  );

  // ── Settings ───────────────────────────────────────────────────────────────
  const barCount = $derived(widget.gauge_settings?.bar_count ?? 32);
  const barColor = $derived(widget.gauge_settings?.bar_color ?? widget.gauge_settings?.color_primary ?? 'var(--theme-primary)');
  const showTrend = $derived(widget.gauge_settings?.show_trend ?? true);

  // ── Historical data buffer ─────────────────────────────────────────────────
  // Keep a rolling buffer of the last `barCount` values to display as bars.
  let history = $state<number[]>([]);

  $effect(() => {
    if (rawValue !== null) {
      history = [...history.slice(-(barCount - 1)), rawValue];
    }
  });

  // Normalize history values to 0-1 for bar heights
  const normalizedHistory = $derived(
    history.map((v) =>
      maxValue !== minValue
        ? Math.min(1, Math.max(0, (v - minValue) / (maxValue - minValue)))
        : 0
    )
  );

  // ── Trend detection ────────────────────────────────────────────────────────
  type TrendDir = 'up' | 'down' | 'flat';
  const trend = $derived<TrendDir>((() => {
    if (history.length < 3) return 'flat';
    const last3 = history.slice(-3);
    const delta = last3[2] - last3[0];
    const range = maxValue - minValue;
    if (delta > range * 0.02) return 'up';
    if (delta < -range * 0.02) return 'down';
    return 'flat';
  })());

  const trendIcon = $derived(trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→');
  const trendColorVar = $derived(
    trend === 'up' ? 'var(--theme-danger)' : trend === 'down' ? 'var(--theme-success)' : 'var(--theme-text-muted)'
  );

  // ── Animated current value pct ─────────────────────────────────────────────
  const animPct = tweened(0, { duration: 400, easing: cubicOut });
  $effect(() => { animPct.set(percentage / 100); });

  // ── Layout ─────────────────────────────────────────────────────────────────
  const chartW = $derived(widget.width - 24);
  const chartH = $derived(widget.height - 24);
  const barAreaW = $derived(Math.max(chartW * 0.55, 80));
  const valueAreaW = $derived(chartW - barAreaW - 8);
  const barAreaH = $derived(chartH - 12);

  const barSpacing = $derived(barAreaW / barCount);
  const barW = $derived(Math.max(1, barSpacing - Math.max(1, barSpacing * 0.2)));

  const fontSize = $derived(Math.min(valueAreaW * 0.55, chartH * 0.45, 28));
  const unitFontSize = $derived(fontSize * 0.42);

  // ── Format ─────────────────────────────────────────────────────────────────
  const formattedValue = $derived(
    rawValue !== null
      ? Number.isInteger(value) ? value.toString() : value.toFixed(1)
      : '--'
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');
  const label = $derived(widget.show_label ? (widget.custom_label || sensorData?.name || '') : '');

  const valid = $derived(chartW > 20 && chartH > 20);

  // Pad history with zeros on the left if not full
  const paddedHistory = $derived(
    normalizedHistory.length >= barCount
      ? normalizedHistory.slice(-barCount)
      : [...Array(barCount - normalizedHistory.length).fill(0), ...normalizedHistory]
  );
</script>

<div class="gauge-container">
  {#if valid}
    <div class="inner" style="width:{chartW}px; height:{chartH}px;">
      <!-- Value section (left) -->
      <div class="value-section" style="width:{valueAreaW}px;">
        <div class="value-line">
          <span class="value-text" style="font-size:{fontSize}px;">{formattedValue}</span>
          {#if unit}
            <span class="unit-text" style="font-size:{unitFontSize}px;">{unit}</span>
          {/if}
        </div>
        {#if showTrend}
          <div class="trend" style="color:{trendColorVar}; font-size:{unitFontSize * 1.2}px;">
            {trendIcon}
          </div>
        {/if}
        {#if label}
          <div class="label-text" style="font-size:{unitFontSize * 0.8}px;">{label}</div>
        {/if}
        <!-- Mini progress bar -->
        <div class="mini-bar">
          <div
            class="mini-bar-fill"
            style="width:{$animPct * 100}%; background:{barColor};"
          ></div>
        </div>
      </div>

      <!-- Spark bar chart (right) -->
      <svg width={barAreaW} height={barAreaH} class="bar-chart" overflow="visible">
        <defs>
          <linearGradient id="spark-bar-grad-{widget.id.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stop-color={barColor} stop-opacity="0.3" />
            <stop offset="100%" stop-color={barColor} stop-opacity="0.9" />
          </linearGradient>
        </defs>

        {#each paddedHistory as normH, i}
          {@const bH = Math.max(2, normH * barAreaH)}
          {@const bX = i * barSpacing}
          {@const bY = barAreaH - bH}
          {@const isLatest = i === paddedHistory.length - 1}
          <rect
            x={bX}
            y={bY}
            width={barW}
            height={bH}
            rx="2"
            fill={isLatest
              ? barColor
              : `url(#spark-bar-grad-${widget.id.replace(/[^a-z0-9]/gi,'')})`}
            opacity={isLatest ? 1 : 0.6 + (i / paddedHistory.length) * 0.4}
          />
        {/each}

        <!-- Baseline -->
        <line
          x1="0" y1={barAreaH}
          x2={barAreaW} y2={barAreaH}
          stroke="var(--theme-border)"
          stroke-width="0.5"
          opacity="0.4"
        />
      </svg>
    </div>
  {:else}
    <div class="fallback">--</div>
  {/if}
</div>

<style>
  .gauge-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: var(--theme-surface);
    border-radius: 0.75rem;
    font-family: var(--font-family, sans-serif);
    overflow: hidden;
  }
  .inner {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }
  .value-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    flex-shrink: 0;
    overflow: hidden;
  }
  .value-line {
    display: flex;
    align-items: baseline;
    gap: 3px;
    line-height: 1;
  }
  .value-text {
    font-weight: 700;
    color: var(--theme-text);
    line-height: 1;
    white-space: nowrap;
  }
  .unit-text {
    color: var(--theme-text-muted);
    opacity: 0.75;
    line-height: 1;
    white-space: nowrap;
  }
  .trend {
    font-weight: 600;
    line-height: 1;
  }
  .label-text {
    color: var(--theme-text-muted);
    opacity: 0.55;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
  }
  .mini-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
  }
  .mini-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .bar-chart {
    flex-shrink: 0;
  }
  .fallback {
    color: var(--theme-text-muted);
    opacity: 0.6;
    font-size: 1.5rem;
  }
</style>
