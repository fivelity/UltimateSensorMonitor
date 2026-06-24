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
  const startAngleDeg = $derived(widget.gauge_settings?.start_angle ?? -135);
  const endAngleDeg = $derived(widget.gauge_settings?.end_angle ?? 135);
  const ringThicknessPct = $derived(
    widget.gauge_settings?.ring_thickness ?? 0.12,
  ); // fraction of radius
  const glowColor = $derived(
    widget.gauge_settings?.glow_color ??
      widget.gauge_settings?.color_primary ??
      "var(--theme-primary)",
  );
  const useGradient = $derived(widget.gauge_settings?.use_gradient ?? false);
  const gradientEndColor = $derived(
    widget.gauge_settings?.gradient_end_color ?? "var(--theme-danger)",
  );
  const primaryColor = $derived(
    widget.gauge_settings?.color_primary ?? "var(--theme-primary)",
  );
  const cornerRad = $derived(widget.gauge_settings?.corner_radius ?? 4);

  // ── Animated progress ──────────────────────────────────────────────────────
  const animPct = tweened(0, { duration: 750, easing: cubicOut });
  $effect(() => {
    animPct.set(percentage);
  });

  // ── Layout ─────────────────────────────────────────────────────────────────
  const size = $derived(Math.min(widget.width - 24, widget.height - 24));
  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const maxR = $derived(size / 2 - 6);
  const ringThickness = $derived(Math.max(6, maxR * ringThicknessPct));
  const outerR = $derived(maxR);
  const innerR = $derived(maxR - ringThickness);

  function toRad(deg: number) {
    return deg * (Math.PI / 180);
  }

  const totalSweep = $derived(endAngleDeg - startAngleDeg);

  // D3 arc generator helper
  function makeArc(
    startDeg: number,
    endDeg: number,
    iR: number,
    oR: number,
    cR = 0,
  ): string {
    const gen = d3Arc();
    return (
      gen({
        innerRadius: iR,
        outerRadius: oR,
        startAngle: toRad(startDeg),
        endAngle: toRad(endDeg),
        padAngle: 0,
        cornerRadius: cR,
      } as Parameters<typeof gen>[0]) ?? ""
    );
  }

  // Track arc (full sweep, background)
  const trackArc = $derived(
    makeArc(startAngleDeg, endAngleDeg, innerR, outerR),
  );
  // Progress arc (animated)
  const progressEndDeg = $derived(startAngleDeg + $animPct * totalSweep);
  const progressArc = $derived(
    $animPct > 0.005
      ? makeArc(startAngleDeg, progressEndDeg, innerR, outerR, cornerRad)
      : "",
  );

  // End-cap tick for value pointer
  function arcEndPoint(deg: number, r: number) {
    const rad = toRad(deg - 90);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  const progressTipOuter = $derived(arcEndPoint(progressEndDeg, outerR));

  // Min / max labels
  const minPt = $derived(arcEndPoint(startAngleDeg, outerR + 12));
  const maxPt = $derived(arcEndPoint(endAngleDeg, outerR + 12));

  // ── Labels ─────────────────────────────────────────────────────────────────
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
  const fontSize = $derived(Math.min(size / 4.5, 30));
  const unitFontSize = $derived(fontSize * 0.42);

  function isValidSize(s: number) {
    return typeof s === "number" && isFinite(s) && s > 10;
  }
  const valid = $derived(isValidSize(size) && outerR > 0 && innerR > 0);

  const gradId = $derived(widget.id.replace(/[^a-z0-9]/gi, ""));

  // Percentage text
  const pctText = $derived(Math.round(percentage * 100) + "%");
</script>

<div class="gauge-container">
  {#if valid}
    <svg width={size} height={size} overflow="visible">
      <defs>
        <!-- Gradient stroke for progress arc -->
        <linearGradient
          id="donut-grad-{gradId}"
          x1="0"
          y1={cy}
          x2={size}
          y2={cy}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stop-color={primaryColor} />
          <stop offset="100%" stop-color={gradientEndColor} />
        </linearGradient>

        <!-- Outer glow for progress arc -->
        <filter
          id="donut-glow-{gradId}"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Subtle inner rim glow -->
        <filter
          id="inner-glow-{gradId}"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      <g transform="translate({cx},{cy})">
        <!-- Track arc (background) -->
        <path
          d={trackArc}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.07)"
          stroke-width="0.5"
        />

        <!-- Inner glow shadow (purely additive, rendered below progress) -->
        {#if progressArc}
          <path
            d={progressArc}
            fill={useGradient ? `url(#donut-grad-${gradId})` : glowColor}
            opacity="0.25"
            filter="url(#inner-glow-{gradId})"
          />
        {/if}

        <!-- Progress arc -->
        {#if progressArc}
          <path
            d={progressArc}
            fill={useGradient ? `url(#donut-grad-${gradId})` : primaryColor}
            filter="url(#donut-glow-{gradId})"
          />
        {/if}

        <!-- Tip indicator dot at progress end -->
        {#if $animPct > 0.02}
          <circle
            cx={progressTipOuter.x - cx}
            cy={progressTipOuter.y - cy}
            r={ringThickness * 0.22}
            fill="white"
            opacity="0.8"
          />
        {/if}

        <!-- Center value text -->
        <text
          x="0"
          y={label ? -fontSize * 0.55 : 0}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={fontSize}
          font-weight="700"
          fill="var(--theme-text)"
          font-family="var(--font-family, sans-serif)">{formattedValue}</text
        >

        {#if unit}
          <text
            x="0"
            y={label ? fontSize * 0.15 : fontSize * 0.6}
            text-anchor="middle"
            dominant-baseline="central"
            font-size={unitFontSize}
            fill="var(--theme-text-muted)"
            opacity="0.7"
            font-family="var(--font-family, sans-serif)">{unit}</text
          >
        {/if}

        {#if label}
          <text
            x="0"
            y={fontSize * 0.9}
            text-anchor="middle"
            dominant-baseline="central"
            font-size={unitFontSize * 0.85}
            fill="var(--theme-text-muted)"
            opacity="0.5"
            font-family="var(--font-family, sans-serif)">{label}</text
          >
        {/if}
      </g>

      <!-- Min/max endpoint labels -->
      <text
        x={minPt.x}
        y={minPt.y}
        text-anchor="middle"
        dominant-baseline="central"
        font-size="9"
        fill="var(--theme-text-muted)"
        opacity="0.5"
        font-family="var(--font-family, sans-serif)">{minValue}</text
      >

      <text
        x={maxPt.x}
        y={maxPt.y}
        text-anchor="middle"
        dominant-baseline="central"
        font-size="9"
        fill="var(--theme-text-muted)"
        opacity="0.5"
        font-family="var(--font-family, sans-serif)">{maxValue}</text
      >

      <!-- Percentage badge near arc end tip -->
      <text
        x={cx}
        y={size - 2}
        text-anchor="middle"
        dominant-baseline="auto"
        font-size="9"
        fill="var(--theme-text-muted)"
        opacity="0.4"
        font-family="var(--font-family, sans-serif)">{pctText}</text
      >
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
