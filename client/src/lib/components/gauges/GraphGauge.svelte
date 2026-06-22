<script lang="ts">
  import type { WidgetConfig, SensorData } from '$lib/types';
  import * as d3 from 'd3';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  let svgElement: SVGElement | undefined = $state();
  let dataHistory: { timestamp: Date; value: number }[] = $state([]);

  // Graph settings with defaults
  const timeRange = $derived(widget.gauge_settings.time_range || 60); // seconds
  const lineColor = $derived(widget.gauge_settings.line_color || 'var(--theme-primary)');
  const fillArea = $derived(widget.gauge_settings.fill_area || false);
  const showPoints = $derived(widget.gauge_settings.show_points || false);

  // Responsive dimensions
  const width = $derived(widget.width - 16); // Account for padding
  const height = $derived(widget.height - 32); // Account for padding and labels
  const sensorName = $derived(widget.custom_label || sensorData?.name || 'Unknown Sensor');
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');

  // Data collection and management
  function addDataPoint() {
    if (sensorData?.value !== undefined && typeof sensorData.value === 'number') {
      const now = new Date();
      dataHistory = [...dataHistory, { timestamp: now, value: sensorData.value as number }];

      // Remove old data points outside the time range
      const cutoffTime = new Date(now.getTime() - timeRange * 1000);
      dataHistory = dataHistory.filter(d => d.timestamp >= cutoffTime);

      updateGraph();
    }
  }

  function updateGraph() {
    if (!svgElement || dataHistory.length === 0) return;

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove(); // Clear previous content

    const margin = { top: 10, right: 10, bottom: 20, left: 30 };
    const innerWidth = Math.max(width - margin.left - margin.right, 0);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 0);

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(dataHistory, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(dataHistory, d => d.value) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    // Line generator
    const line = d3.line<{ timestamp: Date; value: number }>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Fill area generator
    const area = d3.area<{ timestamp: Date; value: number }>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add fill area if enabled
    if (fillArea) {
      g.append('path')
        .datum(dataHistory)
        .attr('fill', lineColor)
        .attr('opacity', 0.2)
        .attr('d', area);
    }

    // Add the line
    g.append('path')
      .datum(dataHistory)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add points if enabled
    if (showPoints) {
      g.selectAll('.dot')
        .data(dataHistory)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.timestamp))
        .attr('cy', d => yScale(d.value))
        .attr('r', 2)
        .attr('fill', lineColor);
    }

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M') as (domainValue: Date | d3.NumberValue, index: number) => string)
        .ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--theme-text-muted)');

    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'var(--theme-text-muted)');

    // Style axes
    g.selectAll('.domain, .tick line')
      .style('stroke', 'var(--theme-border)');
  }

  $effect(() => {
    // Start collecting data every second
    const interval = setInterval(addDataPoint, 1000);

    // Add initial data point
    addDataPoint();

    return () => {
      clearInterval(interval);
    };
  });

  // Update graph when widget size changes
  $effect(() => {
    if (width && height) {
      updateGraph();
    }
  });
</script>

<div class="gauge-container">
  <!-- Title -->
  {#if widget.show_label}
    <div class="text-center text-xs font-medium text-[var(--theme-text-muted)] mb-1 truncate">
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
    Current: <span class="font-semibold text-[var(--theme-text)]">
      {sensorData?.value ?? '--'}
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
