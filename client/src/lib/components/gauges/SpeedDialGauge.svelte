<script lang="ts">
  import { arc as d3Arc } from 'd3-shape';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { WidgetConfig, SensorData } from '$lib/types';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  // ── Sensor values ──────────────────────────────────────────────────────────
  const value = $derived(typeof sensorData?.value === 'number' ? sensorData.value : 0);
  const minValue = $derived(widget.gauge_settings?.min_value ?? sensorData?.min_value ?? 0);
  const maxValue = $derived(widget.gauge_settings?.max_value ?? sensorData?.max_value ?? 100);
  const percentage = $derived(
    maxValue !== minValue
      ? Math.min(1, Math.max(0, (value - minValue) / (maxValue - minValue)))
      : 0
  );

  // ── Settings ───────────────────────────────────────────────────────────────
  const startAngleDeg = $derived(widget.gauge_settings?.start_angle ?? -135);
  const endAngleDeg = $derived(widget.gauge_settings?.end_angle ?? 135);
  const zoneLowPct = $derived(widget.gauge_settings?.zone_low ?? 33);
  const zoneHighPct = $derived(widget.gauge_settings?.zone_high ?? 66);
  const showTicks = $derived(widget.gauge_settings?.show_ticks ?? true);
  const tickCount = $derived(widget.gauge_settings?.tick_count ?? 10);
  const needleColor = $derived(widget.gauge_settings?.needle_color ?? 'var(--theme-text)');
  const strokeWidth = $derived(widget.gauge_settings?.stroke_width ?? 12);

  // ── Animated progress ──────────────────────────────────────────────────────
  const animPct = tweened(0, { duration: 800, easing: cubicOut });
  $effect(() => { animPct.set(percentage); });

  // ── Layout ─────────────────────────────────────────────────────────────────
  const size = $derived(Math.min(widget.width - 24, widget.height - 24));
  const cx = $derived(size / 2);
  const cy = $derived(size / 2 + size * 0.05); // shift center down a touch for visual balance
  const outerR = $derived((size / 2) - 8);
  const innerR = $derived(outerR - strokeWidth);
  const tickOuterR = $derived(outerR + 4);
  const tickInnerR = $derived(outerR - strokeWidth - 6);
  const labelR = $derived(tickInnerR - 10);

  function toRad(deg: number) { return deg * (Math.PI / 180); }

  // Convert an angle (0=top, degrees) in the gauge coordinate system to SVG x,y
  function gaugePoint(deg: number, r: number) {
    const rad = toRad(deg - 90);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Total sweep range
  const totalSweep = $derived(endAngleDeg - startAngleDeg);

  // Zone arc paths using D3 arc
  function zoneArc(startPct: number, endPct: number) {
    const s = toRad(startAngleDeg + startPct / 100 * totalSweep);
    const e = toRad(startAngleDeg + endPct / 100 * totalSweep);
    const gen = d3Arc();
    return gen({
      innerRadius: innerR,
      outerRadius: outerR,
      startAngle: s,
      endAngle: e,
      padAngle: 0,
    } as Parameters<typeof gen>[0]) ?? '';
  }

  const greenArc = $derived(zoneArc(0, zoneLowPct));
  const yellowArc = $derived(zoneArc(zoneLowPct, zoneHighPct));
  const redArc = $derived(zoneArc(zoneHighPct, 100));

  // ── Tick marks ─────────────────────────────────────────────────────────────
  interface Tick {
    x1: number; y1: number;
    x2: number; y2: number;
    isMajor: boolean;
    labelX: number; labelY: number;
    labelVal: string;
  }

  const ticks = $derived<Tick[]>(
    Array.from({ length: tickCount + 1 }, (_, i) => {
      const pct = i / tickCount;
      const deg = startAngleDeg + pct * totalSweep;
      const isMajor = i % Math.ceil(tickCount / 5) === 0;
      const outerPt = gaugePoint(deg, tickOuterR);
      const innerPt = gaugePoint(deg, isMajor ? tickInnerR : tickInnerR + 4);
      const labelPt = gaugePoint(deg, labelR);
      const labelVal = (minValue + pct * (maxValue - minValue)).toFixed(
        Number.isInteger(minValue) && Number.isInteger(maxValue) ? 0 : 1
      );
      return {
        x1: outerPt.x, y1: outerPt.y,
        x2: innerPt.x, y2: innerPt.y,
        isMajor,
        labelX: labelPt.x, labelY: labelPt.y,
        labelVal,
      };
    })
  );

  // ── Needle ─────────────────────────────────────────────────────────────────
  const needleDeg = $derived(startAngleDeg + $animPct * totalSweep);
  const needleLength = $derived(outerR - strokeWidth * 0.5);
  const needleBase = $derived(needleLength * 0.18);

  /**
   * Thin tapered needle: triangle from pivot toward tip, with tail.
   * Computed in local space (pointing up = 0°), then rotated.
   */
  function needlePath(len: number, base: number): string {
    // tip at (0, -len), base wings at (±base, tailLen)
    const tail = base * 0.6;
    return `M 0 ${-len} L ${base * 0.4} ${tail} L 0 ${tail * 0.5} L ${-base * 0.4} ${tail} Z`;
  }

  // ── Labels ─────────────────────────────────────────────────────────────────
  const formattedValue = $derived(
    typeof value === 'number'
      ? Number.isInteger(value) ? value.toString() : value.toFixed(1)
      : '--'
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');
  const label = $derived(widget.show_label ? (widget.custom_label || sensorData?.name || '') : '');
  const fontSize = $derived(Math.min(size / 5.5, 24));

  function isValidSize(s: number) { return typeof s === 'number' && isFinite(s) && s > 10; }
  const valid = $derived(isValidSize(size) && isValidSize(outerR) && innerR > 0);

  const gradId = $derived(widget.id.replace(/[^a-z0-9]/gi, ''));
</script>

<div class="gauge-container">
  {#if valid}
    <svg width={size} height={size} overflow="visible">
      <defs>
        <filter id="needle-glow-{gradId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="pivot-grad-{gradId}" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="var(--theme-text)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--theme-text)" stop-opacity="0.3" />
        </radialGradient>
      </defs>

      <g transform="translate({cx},{cy})">
        <!-- Zone arcs -->
        <path d={greenArc}  fill="var(--theme-success)" opacity="0.75" />
        <path d={yellowArc} fill="var(--theme-warning)" opacity="0.75" />
        <path d={redArc}    fill="var(--theme-danger)"  opacity="0.75" />

        <!-- Background track ring (thin inner edge) -->
        <path
          d={(() => {
            const gen = d3Arc();
            return gen({
              innerRadius: innerR - 2,
              outerRadius: innerR,
              startAngle: toRad(startAngleDeg),
              endAngle: toRad(endAngleDeg),
              padAngle: 0,
            } as Parameters<typeof gen>[0]) ?? '';
          })()}
          fill="rgba(255,255,255,0.06)"
        />

        <!-- Tick marks -->
        {#if showTicks}
          {#each ticks as tick}
            <line
              x1={tick.x1 - cx} y1={tick.y1 - cy}
              x2={tick.x2 - cx} y2={tick.y2 - cy}
              stroke="var(--theme-text-muted)"
              stroke-width={tick.isMajor ? 1.5 : 0.75}
              opacity={tick.isMajor ? 0.6 : 0.35}
              stroke-linecap="round"
            />
            {#if tick.isMajor}
              <text
                x={tick.labelX - cx}
                y={tick.labelY - cy}
                text-anchor="middle"
                dominant-baseline="central"
                font-size="8"
                fill="var(--theme-text-muted)"
                opacity="0.55"
                font-family="var(--font-family, sans-serif)"
              >{tick.labelVal}</text>
            {/if}
          {/each}
        {/if}

        <!-- Needle -->
        <path
          d={needlePath(needleLength, needleBase)}
          fill={needleColor}
          transform="rotate({needleDeg})"
          filter="url(#needle-glow-{gradId})"
          opacity="0.95"
        />

        <!-- Pivot circle -->
        <circle r={needleBase * 0.9} fill="url(#pivot-grad-{gradId})" />
        <circle r={needleBase * 0.45} fill="var(--theme-surface)" />
      </g>

      <!-- Value display (below center) -->
      <text
        x={cx}
        y={cy + outerR * 0.45}
        text-anchor="middle"
        dominant-baseline="central"
        font-size={fontSize}
        font-weight="700"
        fill="var(--theme-text)"
        font-family="var(--font-family, sans-serif)"
      >{formattedValue}</text>

      {#if unit}
        <text
          x={cx}
          y={cy + outerR * 0.45 + fontSize * 0.9}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={fontSize * 0.45}
          fill="var(--theme-text-muted)"
          opacity="0.7"
          font-family="var(--font-family, sans-serif)"
        >{unit}</text>
      {/if}

      {#if label}
        <text
          x={cx}
          y={size - 8}
          text-anchor="middle"
          dominant-baseline="auto"
          font-size={fontSize * 0.4}
          fill="var(--theme-text-muted)"
          opacity="0.5"
          font-family="var(--font-family, sans-serif)"
        >{label}</text>
      {/if}
    </svg>
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
  }
  .fallback {
    color: var(--theme-text-muted);
    opacity: 0.6;
    font-size: 1.5rem;
  }
</style>
