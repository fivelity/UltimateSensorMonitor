<script lang="ts">
  import type { SensorData, WidgetConfig } from "$lib/types";
  import { arc as d3Arc } from "d3-shape";
  import { cubicOut } from "svelte/easing";
  import { tweened } from "svelte/motion";

  const {
    widget,
    sensorData,
  }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  // ── Sensor values ──────────────────────────────────────────────────────────
  const value = $derived(
    typeof sensorData?.value === "number" ? sensorData.value : 0,
  );
  const minValue = $derived(
    widget.gauge_settings?.min_value ?? sensorData?.min_value ?? 0,
  );
  const maxValue = $derived(
    widget.gauge_settings?.max_value ?? sensorData?.max_value ?? 100,
  );
  const percentage = $derived(
    maxValue !== minValue
      ? Math.min(1, Math.max(0, (value - minValue) / (maxValue - minValue)))
      : 0,
  );

  // ── Settings ───────────────────────────────────────────────────────────────
  const segmentCount = $derived(widget.gauge_settings?.segment_count ?? 24);
  const segmentGap = $derived(widget.gauge_settings?.segment_gap ?? 3); // degrees
  const colorMode = $derived(widget.gauge_settings?.color_mode ?? "single");
  const colorStart = $derived(
    widget.gauge_settings?.color_start ?? "var(--theme-success)",
  );
  const colorEnd = $derived(
    widget.gauge_settings?.color_end ?? "var(--theme-danger)",
  );
  const primaryColor = $derived(
    widget.gauge_settings?.color_primary ?? "var(--theme-primary)",
  );
  const secondaryColor = $derived(
    widget.gauge_settings?.color_secondary ?? "rgba(255,255,255,0.08)",
  );
  const cornerRad = $derived(widget.gauge_settings?.corner_radius ?? 2);
  const strokeWidth = $derived(widget.gauge_settings?.stroke_width ?? 10);
  const startAngleDeg = $derived(widget.gauge_settings?.start_angle ?? -135);
  const endAngleDeg = $derived(widget.gauge_settings?.end_angle ?? 135);

  // Zone thresholds (0–1)
  const zoneLow = $derived((widget.gauge_settings?.zone_low ?? 33) / 100);
  const zoneHigh = $derived((widget.gauge_settings?.zone_high ?? 66) / 100);

  // ── Animated progress ──────────────────────────────────────────────────────
  const animPct = tweened(0, { duration: 700, easing: cubicOut });
  $effect(() => {
    animPct.set(percentage);
  });

  // ── Layout ─────────────────────────────────────────────────────────────────
  const size = $derived(Math.min(widget.width - 24, widget.height - 24));
  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const outerR = $derived(size / 2 - 4);
  const innerR = $derived(outerR - strokeWidth);

  // ── D3 arc builder ─────────────────────────────────────────────────────────
  function toRad(deg: number) {
    return deg * (Math.PI / 180);
  }

  /**
   * Build an array of SVG path strings — one per segment.
   * The filled portion is determined by animPct (0→1).
   */
  function buildSegments(
    filledFraction: number,
    outerRadius: number,
    innerRadius: number,
  ): { d: string; filled: boolean; ratio: number }[] {
    const totalSweep = endAngleDeg - startAngleDeg; // e.g. 270°
    const segSweep = totalSweep / segmentCount - segmentGap;
    const filledCount = filledFraction * segmentCount;

    const arcGen = d3Arc();

    return Array.from({ length: segmentCount }, (_, i) => {
      const segStart = startAngleDeg + i * (totalSweep / segmentCount);
      const segEnd = segStart + segSweep;
      const ratio = i / segmentCount; // 0→1 position along arc
      const filled = i < filledCount;

      const d =
        arcGen({
          innerRadius: innerRadius,
          outerRadius: outerRadius,
          startAngle: toRad(segStart),
          endAngle: toRad(segEnd),
          padAngle: 0,
        } as Parameters<typeof arcGen>[0]) ?? "";

      return { d, filled, ratio };
    });
  }

  /**
   * Resolve the color for a filled segment based on colorMode.
   */
  function segmentColor(ratio: number): string {
    if (colorMode === "zone") {
      if (ratio < zoneLow) return "var(--theme-success)";
      if (ratio < zoneHigh) return "var(--theme-warning)";
      return "var(--theme-danger)";
    }
    if (colorMode === "gradient") {
      // Inline CSS gradient via hsl interpolation isn't doable without a real
      // color parser, so we use CSS color-mix where supported, with a fallback
      // of primary → colorEnd blended via opacity trick on two layered rects.
      // We handle this by assigning a data attribute and using SVG <linearGradient>.
      return `url(#seg-grad-${gradId})`;
    }
    return primaryColor;
  }

  // Unique gradient id per widget
  const gradId = $derived(widget.id.replace(/[^a-z0-9]/gi, ""));

  // Segments recomputed whenever animation progress changes
  const segments = $derived(buildSegments($animPct, outerR, innerR));

  // ── Label formatting ───────────────────────────────────────────────────────
  const formattedValue = $derived(
    typeof value === "number"
      ? Number.isInteger(value)
        ? value.toString()
        : value.toFixed(1)
      : "--",
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || "");
  const label = $derived(
    widget.show_label ? widget.custom_label || sensorData?.name || "" : "",
  );
  const fontSize = $derived(Math.min(size / 5, 28));
  const unitFontSize = $derived(fontSize * 0.45);

  // Min/max label positions (at arc endpoints)
  function arcEndPoint(deg: number, r: number) {
    const rad = toRad(deg - 90);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  const minPt = $derived(arcEndPoint(startAngleDeg, outerR + 10));
  const maxPt = $derived(arcEndPoint(endAngleDeg, outerR + 10));

  function isValidSize(s: number) {
    return typeof s === "number" && isFinite(s) && s > 10;
  }
  const valid = $derived(
    isValidSize(size) && isValidSize(outerR) && innerR > 0,
  );
</script>

<div class="gauge-container">
  {#if valid}
    <svg width={size} height={size} overflow="visible">
      <defs>
        <!-- Gradient used when colorMode === 'gradient' -->
        <linearGradient
          id="seg-grad-{gradId}"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={cy}
          x2={size}
          y2={cy}
        >
          <stop offset="0%" stop-color={colorStart} />
          <stop offset="100%" stop-color={colorEnd} />
        </linearGradient>

        <!-- Glow filter for filled segments -->
        <filter
          id="seg-glow-{gradId}"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate({cx},{cy})">
        {#each segments as seg, i}
          {#if seg.d}
            <path
              d={seg.d}
              fill={seg.filled ? segmentColor(seg.ratio) : secondaryColor}
              rx={cornerRad}
              opacity={seg.filled ? 1 : 0.35}
              filter={seg.filled ? `url(#seg-glow-${gradId})` : undefined}
            />
          {/if}
        {/each}
      </g>

      <!-- Min label -->
      <text
        x={minPt.x}
        y={minPt.y}
        text-anchor="middle"
        dominant-baseline="central"
        font-size="9"
        fill="var(--theme-text-muted)"
        opacity="0.6">{minValue}</text
      >

      <!-- Max label -->
      <text
        x={maxPt.x}
        y={maxPt.y}
        text-anchor="middle"
        dominant-baseline="central"
        font-size="9"
        fill="var(--theme-text-muted)"
        opacity="0.6">{maxValue}</text
      >

      <!-- Center: value + unit -->
      <text
        x={cx}
        y={label ? cy - fontSize * 0.6 : cy}
        text-anchor="middle"
        dominant-baseline="central"
        font-size={fontSize}
        font-weight="700"
        fill="var(--theme-text)"
        font-family="var(--font-family, sans-serif)">{formattedValue}</text
      >

      {#if unit}
        <text
          x={cx}
          y={label ? cy + fontSize * 0.1 : cy + fontSize * 0.7}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={unitFontSize}
          fill="var(--theme-text-muted)"
          opacity="0.75"
          font-family="var(--font-family, sans-serif)">{unit}</text
        >
      {/if}

      {#if label}
        <text
          x={cx}
          y={cy + fontSize * 0.9}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={unitFontSize * 0.85}
          fill="var(--theme-text-muted)"
          opacity="0.55"
          font-family="var(--font-family, sans-serif)">{label}</text
        >
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
