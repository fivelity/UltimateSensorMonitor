<script lang="ts">
  import type { SensorData, WidgetConfig } from "$lib/types";
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
  const minValue = $derived(sensorData?.min_value ?? 0);
  const maxValue = $derived(sensorData?.max_value ?? 100);
  const percentage = $derived(
    maxValue !== minValue
      ? Math.min(
          100,
          Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100),
        )
      : null,
  );

  // ── Gauge settings with defaults ───────────────────────────────────────────
  const startAngle = $derived(widget.gauge_settings?.start_angle ?? -90);
  const endAngle = $derived(widget.gauge_settings?.end_angle ?? 270);
  const strokeWidth = $derived(widget.gauge_settings?.stroke_width ?? 8);
  const primaryColor = $derived(
    widget.gauge_settings?.color_primary ?? "var(--theme-primary)",
  );
  const secondaryColor = $derived(
    widget.gauge_settings?.color_secondary ?? "var(--theme-border)",
  );
  const useGradient = $derived(widget.gauge_settings?.use_gradient ?? false);
  const gradientEndColor = $derived(
    widget.gauge_settings?.gradient_end_color ?? "var(--theme-danger)",
  );

  // ── Tweened animation ──────────────────────────────────────────────────────
  const animPct = tweened(0, { duration: 600, easing: cubicOut });
  $effect(() => {
    animPct.set(percentage ?? 0);
  });

  // ── Calculate gauge dimensions ─────────────────────────────────────────────
  const size = $derived(Math.min(widget.width - 32, widget.height - 32));
  const radius = $derived(size / 2 - strokeWidth / 2);
  const center = $derived(size / 2);

  // ── Validate all gauge values before rendering ─────────────────────────────
  function isValidNumber(val: number | null | undefined): val is number {
    return typeof val === "number" && !isNaN(val) && isFinite(val);
  }

  const validGauge = $derived(
    isValidNumber(size) &&
      size > 0 &&
      isValidNumber(radius) &&
      radius > 0 &&
      isValidNumber(center),
  );

  // ── Arc path helpers ───────────────────────────────────────────────────────
  function polarToCartesian(
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number,
  ) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  }

  function describeArc(
    x: number,
    y: number,
    r: number,
    sa: number,
    ea: number,
  ): string {
    const start = polarToCartesian(x, y, r, ea);
    const end = polarToCartesian(x, y, r, sa);
    const largeArcFlag = ea - sa <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  // ── Arc calculations ───────────────────────────────────────────────────────
  const arcLength = $derived(endAngle - startAngle);
  const progressAngle = $derived(startAngle + (arcLength * $animPct) / 100);

  const validAngles = $derived(
    isValidNumber(startAngle) &&
      isValidNumber(endAngle) &&
      isValidNumber(progressAngle),
  );
  const validArc = $derived(
    validGauge && validAngles && isValidNumber(arcLength),
  );

  const backgroundArc = $derived(
    validArc ? describeArc(center, center, radius, startAngle, endAngle) : "",
  );
  const progressArc = $derived(
    validArc && $animPct > 0
      ? describeArc(center, center, radius, startAngle, progressAngle)
      : "",
  );

  // ── Tick marks ─────────────────────────────────────────────────────────────
  const tickCount = 10;
  interface RadialTick {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    isMajor: boolean;
  }

  const ticks = $derived<RadialTick[]>(
    validGauge
      ? Array.from({ length: tickCount + 1 }, (_, i) => {
          const pct = i / tickCount;
          const deg = startAngle + pct * arcLength;
          const isMajor = i % 2 === 0;
          const outerPt = polarToCartesian(
            center,
            center,
            radius + strokeWidth * 0.5 + 2,
            deg,
          );
          const innerPt = polarToCartesian(
            center,
            center,
            radius - strokeWidth * 0.5 - (isMajor ? 4 : 2),
            deg,
          );
          return {
            x1: outerPt.x,
            y1: outerPt.y,
            x2: innerPt.x,
            y2: innerPt.y,
            isMajor,
          };
        })
      : [],
  );

  // ── Gradient id ────────────────────────────────────────────────────────────
  const gradId = $derived(widget.id.replace(/[^a-z0-9]/gi, ""));

  // ── Format display value ───────────────────────────────────────────────────
  const formattedValue = $derived(
    typeof value === "number"
      ? Number.isInteger(value)
        ? value.toString()
        : value.toFixed(1)
      : "--",
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || "");
  const fontSize = $derived(Math.min(size / 8, 24));
</script>

<div class="gauge-container">
  <div
    class="relative flex items-center justify-center"
    style="width: {size}px; height: {size}px;"
  >
    <!-- SVG Gauge -->
    {#if validGauge && validArc}
      <svg width={size} height={size} class="absolute" overflow="visible">
        <defs>
          <!-- Gradient along the arc (approximated via linear gradient across bounding box) -->
          <linearGradient
            id="radial-grad-{gradId}"
            x1="0"
            y1={center}
            x2={size}
            y2={center}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color={primaryColor} />
            <stop offset="100%" stop-color={gradientEndColor} />
          </linearGradient>

          <!-- Soft glow for progress arc -->
          <filter
            id="arc-glow-{gradId}"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Tick marks -->
        {#each ticks as tick}
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="var(--theme-text-muted)"
            stroke-width={tick.isMajor ? 1.5 : 0.75}
            opacity={tick.isMajor ? 0.4 : 0.2}
            stroke-linecap="round"
          />
        {/each}

        <!-- Background arc -->
        <path
          d={backgroundArc}
          fill="none"
          stroke={secondaryColor}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          opacity="0.2"
        />

        <!-- Progress arc glow (background layer) -->
        {#if progressArc}
          <path
            d={progressArc}
            fill="none"
            stroke={useGradient ? `url(#radial-grad-${gradId})` : primaryColor}
            stroke-width={strokeWidth + 4}
            stroke-linecap="round"
            opacity="0.2"
          />
        {/if}

        <!-- Progress arc -->
        {#if progressArc}
          <path
            d={progressArc}
            fill="none"
            stroke={useGradient ? `url(#radial-grad-${gradId})` : primaryColor}
            stroke-width={strokeWidth}
            stroke-linecap="round"
          />
        {/if}
      </svg>
    {:else}
      <div
        class="absolute w-full h-full flex items-center justify-center text-[var(--theme-text-muted)] opacity-60"
        style="font-size: 1.5rem;"
      >
        --
      </div>
    {/if}

    <!-- Center content -->
    <div
      class="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
    >
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
        {percentage !== null ? percentage.toFixed(0) + "%" : "--"}
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
