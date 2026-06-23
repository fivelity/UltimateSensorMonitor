<script lang="ts">
  import type { SensorData, WidgetConfig } from "$lib/types";
  import * as d3 from "d3";
  import { untrack } from "svelte";

  const {
    widget,
    sensorData,
  }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  let svgElement: SVGSVGElement | undefined = $state();
  let dataHistory: { timestamp: Date; value: number }[] = $state([]);

  // Graph settings with defaults
  const timeRange = $derived(widget.gauge_settings.time_range || 60); // seconds
  const lineColor = $derived(
    widget.gauge_settings.line_color || "var(--theme-primary)",
  );
  const fillArea = $derived(widget.gauge_settings.fill_area || false);
  const showPoints = $derived(widget.gauge_settings.show_points || false);

  // Responsive dimensions
  const width = $derived(widget.width - 16); // Account for padding
  const height = $derived(widget.height - 32); // Account for padding and labels
  const sensorName = $derived(
    widget.custom_label || sensorData?.name || "Unknown Sensor",
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || "");

  const margin = { top: 10, right: 10, bottom: 20, left: 30 };

  function addDataPoint() {
    if (
      sensorData?.value === undefined ||
      typeof sensorData.value !== "number"
    ) {
      return;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - timeRange * 1000);
    // Avoid tracking dataHistory inside this update so the $effect that drives
    // the interval does not become a dependency of its own state.
    const previous = untrack(() => dataHistory);
    dataHistory = [
      ...previous.filter((d) => d.timestamp >= cutoff),
      { timestamp: now, value: sensorData.value },
    ];
  }

  $effect(() => {
    addDataPoint();
    const interval = setInterval(addDataPoint, 1000);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (!svgElement || dataHistory.length === 0) return;
    updateGraph();
  });

  function updateGraph() {
    if (!svgElement || dataHistory.length === 0) return;

    const svg = d3.select(svgElement);
    const innerWidth = Math.max(width - margin.left - margin.right, 0);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 0);
    if (innerWidth <= 0 || innerHeight <= 0) return;

    let g = svg.select<SVGGElement>("g.chart-root");
    if (g.empty()) {
      g = svg
        .append("g")
        .attr("class", "chart-root")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const xDomain = d3.extent(dataHistory, (d) => d.timestamp) as [Date, Date];
    const xScale = d3.scaleTime().domain(xDomain).range([0, innerWidth]);

    const yDomain = d3.extent(dataHistory, (d) => d.value) as [number, number];
    const yScale = d3
      .scaleLinear()
      .domain(yDomain)
      .nice()
      .range([innerHeight, 0]);

    const line = d3
      .line<{ timestamp: Date; value: number }>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(3)
      .tickFormat(
        d3.timeFormat("%H:%M") as (
          _domainValue: Date | d3.NumberValue,
          _index: number,
        ) => string,
      );

    let xAxisGroup = svg.select<SVGGElement>("g.x-axis");
    if (xAxisGroup.empty()) {
      xAxisGroup = svg.append("g").attr("class", "x-axis");
    }
    xAxisGroup
      .attr(
        "transform",
        `translate(${margin.left},${innerHeight + margin.top})`,
      )
      .call(xAxis);
    styleAxisText(xAxisGroup);

    const yAxis = d3.axisLeft(yScale).ticks(3);
    let yAxisGroup = svg.select<SVGGElement>("g.y-axis");
    if (yAxisGroup.empty()) {
      yAxisGroup = svg
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    }
    yAxisGroup.call(yAxis);
    styleAxisText(yAxisGroup);

    g.selectAll(".domain, .tick line").style("stroke", "var(--theme-border)");

    let path = g.select<SVGPathElement>("path.line");
    if (path.empty()) {
      path = g.append("path").attr("class", "line");
    }
    path
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 2)
      .attr("d", line(dataHistory));

    if (fillArea) {
      const area = d3
        .area<{ timestamp: Date; value: number }>()
        .x((d) => xScale(d.timestamp))
        .y0(innerHeight)
        .y1((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);
      let areaPath = g.select<SVGPathElement>("path.area");
      if (areaPath.empty()) {
        areaPath = g.append("path").attr("class", "area");
      }
      areaPath
        .attr("fill", lineColor)
        .attr("opacity", 0.2)
        .attr("d", area(dataHistory));
    } else {
      g.select("path.area").remove();
    }

    if (showPoints) {
      g.selectAll("circle.dot")
        .data(dataHistory)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xScale(d.timestamp))
        .attr("cy", (d) => yScale(d.value))
        .attr("r", 2)
        .attr("fill", lineColor);
    } else {
      g.selectAll("circle.dot").remove();
    }
  }

  function styleAxisText(
    selection: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) {
    selection
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "var(--theme-text-muted)");
  }
</script>

<div class="gauge-container">
  <!-- Title -->
  {#if widget.show_label}
    <div
      class="text-center text-xs font-medium text-[var(--theme-text-muted)] mb-1 truncate"
    >
      {sensorName}
      {#if widget.show_unit && unit}
        <span class="opacity-75">({unit})</span>
      {/if}
    </div>
  {/if}

  <!-- SVG Graph -->
  <svg
    bind:this={svgElement}
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    class="block w-full h-full"
  ></svg>

  <!-- Current Value Display -->
  <div class="text-center text-xs text-[var(--theme-text-muted)] mt-1">
    Current:
    <span class="font-semibold text-[var(--theme-text)]">
      {sensorData?.value ?? "--"}
      {#if widget.show_unit && unit}{unit}{/if}
    </span>
  </div>
</div>

<style>
  .gauge-container {
    width: 100%;
    height: 100%;
    padding: 8px;
    display: flex;
    flex-direction: column;
  }
</style>
