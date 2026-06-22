<script lang="ts">
  import { selectedWidgetConfigs, storeUtils, sensorSources } from '$lib/stores';
  import type { GaugeType, SensorData, WidgetConfig } from '$lib/types';

  const gaugeTypes: { value: GaugeType; label: string; description: string }[] = [
    { value: 'text', label: 'Text Value', description: 'Simple text display' },
    { value: 'radial', label: 'Radial Gauge', description: 'Circular progress gauge' },
    { value: 'linear', label: 'Linear Bar', description: 'Horizontal or vertical bar' },
    { value: 'graph', label: 'Time Graph', description: 'Historical data chart' },
    { value: 'image', label: 'Image Sequence', description: 'Custom image animation' },
    { value: 'glassmorphic', label: 'Glassmorphic', description: 'Modern glass effect gauge' }
  ];

  const selectedWidget = $derived($selectedWidgetConfigs[0]);
  const isMultipleSelection = $derived($selectedWidgetConfigs.length > 1);

  function updateWidget(updates: Partial<WidgetConfig>) {
    if (selectedWidget) {
      storeUtils.updateWidget(selectedWidget.id, updates);
    }
  }

  function updateGaugeType(value: string) {
    updateWidget({ gauge_type: value as GaugeType });
  }

  function updateGaugeSettings(key: string, value: unknown) {
    if (selectedWidget) {
      const newSettings = { ...selectedWidget.gauge_settings, [key]: value };
      updateWidget({ gauge_settings: newSettings });
    }
  }

  function updateStyleSettings(key: string, value: unknown) {
    if (selectedWidget) {
      const newSettings = { ...selectedWidget.style_settings, [key]: value };
      updateWidget({ style_settings: newSettings });
    }
  }

  // Get available sensors for sensor selection
  const availableSensors = $derived(
    Object.values($sensorSources).flatMap((source): SensorData[] =>
      source.active ? source.sensors : []
    )
  );
</script>

<div class="p-4 space-y-6">
  {#if !selectedWidget}
    <div class="text-center text-[var(--theme-text-muted)] py-8">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>Select a widget to configure its properties</p>
    </div>
  {:else if isMultipleSelection}
    <div class="text-center text-[var(--theme-text-muted)] py-8">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p>Multiple widgets selected</p>
      <p class="text-sm mt-1">Select a single widget to edit its properties</p>
    </div>
  {:else}
    <!-- Widget Basic Info -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Basic Properties</h3>

      <!-- Sensor Selection -->
      <div>
        <label class="block text-sm font-medium text-[var(--theme-text)] mb-2">
          Sensor Data Source
        </label>
        <select
          class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={selectedWidget.sensor_id}
          onchange={(e) => updateWidget({ sensor_id: e.currentTarget.value })}
        >
          {#each availableSensors as sensor}
            <option value={sensor.id}>{sensor.name} ({sensor.category})</option>
          {/each}
        </select>
      </div>

      <!-- Gauge Type -->
      <div>
        <label class="block text-sm font-medium text-[var(--theme-text)] mb-2">
          Gauge Type
        </label>
        <select
          class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={selectedWidget.gauge_type}
          onchange={(e) => updateGaugeType(e.currentTarget.value)}
        >
          {#each gaugeTypes as gaugeType}
            <option value={gaugeType.value}>{gaugeType.label}</option>
          {/each}
        </select>
        <p class="text-xs text-[var(--theme-text-muted)] mt-1">
          {gaugeTypes.find(g => g.value === selectedWidget.gauge_type)?.description}
        </p>
      </div>
    </div>

    <!-- Display Options -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Display Options</h3>

      <!-- Show Label -->
      <div class="flex items-center justify-between">
        <label class="text-sm text-[var(--theme-text)]">Show Label</label>
        <input
          type="checkbox"
          class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
          checked={selectedWidget.show_label}
          onchange={(e) => updateWidget({ show_label: e.currentTarget.checked })}
        />
      </div>

      <!-- Custom Label -->
      {#if selectedWidget.show_label}
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Custom Label
          </label>
          <input
            type="text"
            class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Leave empty to use sensor name"
            value={selectedWidget.custom_label || ''}
            oninput={(e) => updateWidget({ custom_label: e.currentTarget.value || undefined })}
          />
        </div>
      {/if}

      <!-- Show Unit -->
      <div class="flex items-center justify-between">
        <label class="text-sm text-[var(--theme-text)]">Show Unit</label>
        <input
          type="checkbox"
          class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
          checked={selectedWidget.show_unit}
          onchange={(e) => updateWidget({ show_unit: e.currentTarget.checked })}
        />
      </div>

      <!-- Custom Unit -->
      {#if selectedWidget.show_unit}
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Custom Unit
          </label>
          <input
            type="text"
            class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Leave empty to use sensor unit"
            value={selectedWidget.custom_unit || ''}
            oninput={(e) => updateWidget({ custom_unit: e.currentTarget.value || undefined })}
          />
        </div>
      {/if}
    </div>

    <!-- Position & Size -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Position & Size</h3>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-[var(--theme-text-muted)] mb-1">X Position</label>
          <input
            type="number"
            class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)]"
            value={selectedWidget.pos_x}
            oninput={(e) => updateWidget({ pos_x: parseInt(e.currentTarget.value) || 0 })}
          />
        </div>
        <div>
          <label class="block text-xs text-[var(--theme-text-muted)] mb-1">Y Position</label>
          <input
            type="number"
            class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)]"
            value={selectedWidget.pos_y}
            oninput={(e) => updateWidget({ pos_y: parseInt(e.currentTarget.value) || 0 })}
          />
        </div>
        <div>
          <label class="block text-xs text-[var(--theme-text-muted)] mb-1">Width</label>
          <input
            type="number"
            class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)]"
            value={selectedWidget.width}
            oninput={(e) => updateWidget({ width: parseInt(e.currentTarget.value) || 100 })}
          />
        </div>
        <div>
          <label class="block text-xs text-[var(--theme-text-muted)] mb-1">Height</label>
          <input
            type="number"
            class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)]"
            value={selectedWidget.height}
            oninput={(e) => updateWidget({ height: parseInt(e.currentTarget.value) || 100 })}
          />
        </div>
      </div>
    </div>

    <!-- Widget Lock -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Widget Behavior</h3>

      <div class="flex items-center justify-between">
        <label class="text-sm text-[var(--theme-text)]">Lock Widget</label>
        <input
          type="checkbox"
          class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
          checked={selectedWidget.is_locked}
          onchange={(e) => updateWidget({ is_locked: e.currentTarget.checked })}
        />
      </div>
      <p class="text-xs text-[var(--theme-text-muted)]">
        Locked widgets cannot be moved or resized in edit mode
      </p>
    </div>

    <!-- Gauge-Specific Settings -->
    {#if selectedWidget.gauge_type === 'radial'}
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Radial Gauge Settings</h3>

        <div>
          <label class="block text-sm text-[var(--theme-text)] mb-1">Start Angle (degrees)</label>
          <input
            type="number"
            min="0"
            max="360"
            class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)]"
            value={selectedWidget.gauge_settings.start_angle || 0}
            oninput={(e) => updateGaugeSettings('start_angle', parseInt(e.currentTarget.value) || 0)}
          />
        </div>

        <div>
          <label class="block text-sm text-[var(--theme-text)] mb-1">End Angle (degrees)</label>
          <input
            type="number"
            min="0"
            max="360"
            class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)]"
            value={selectedWidget.gauge_settings.end_angle || 270}
            oninput={(e) => updateGaugeSettings('end_angle', parseInt(e.currentTarget.value) || 270)}
          />
        </div>
      </div>
    {:else if selectedWidget.gauge_type === 'linear'}
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide">Linear Gauge Settings</h3>

        <div>
          <label class="block text-sm text-[var(--theme-text)] mb-2">Orientation</label>
          <select
            class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)]"
            value={selectedWidget.gauge_settings.orientation || 'horizontal'}
            onchange={(e) => updateGaugeSettings('orientation', e.currentTarget.value)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
      </div>
    {/if}
  {/if}
</div>
