<script lang="ts">
  import {
    gaugeSettingsSchema,
    gaugeTypeMetadata,
    gaugeTypeOptions,
    parseImageSequenceInput,
  } from "$lib/constants/gauges";
  import {
    alignWidgets,
    availableSensors,
    distributeWidgets,
    inspectorStore,
    selectedWidgetConfigs,
    selectedWidgets,
    sensorData,
    widgets,
    widgetUtils,
  } from "$lib/stores";
  import {
    BatchCommand,
    historyStore,
    RemoveWidgetCommand,
    UpdateWidgetCommand,
  } from "$lib/stores/history";
  import type {
    GaugeSettings,
    GaugeType,
    StyleSettings,
    WidgetConfig,
  } from "$lib/types";
  import { Copy, FileText, Trash2 } from "@lucide/svelte";
  import { get } from "svelte/store";
  import BulkEditHeader from "./BulkEditHeader.svelte";
  import CollapsibleSection from "./CollapsibleSection.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import SensorPicker from "./SensorPicker.svelte";

  const selectedWidgetsList = $derived($selectedWidgetConfigs);
  const selectedWidget = $derived(selectedWidgetsList[0]);
  const isMultipleSelection = $derived(selectedWidgetsList.length > 1);
  const selectionCount = $derived(selectedWidgetsList.length);

  const selectedIds = $derived(
    $selectedWidgets.type === "widget" ? $selectedWidgets.ids : [],
  );

  const selectedSensorInfo = $derived(
    selectedWidget
      ? $availableSensors.find((s) => s.id === selectedWidget.sensor_id)
      : undefined,
  );

  const commonGaugeType = $derived(
    selectedWidgetsList.length > 0
      ? selectedWidgetsList.every(
          (w) => w.gauge_type === selectedWidgetsList[0].gauge_type,
        )
        ? selectedWidgetsList[0].gauge_type
        : undefined
      : undefined,
  );

  const hasMixedGaugeType = $derived(
    isMultipleSelection && commonGaugeType === undefined,
  );

  const gaugeSchema = $derived(
    commonGaugeType ? gaugeSettingsSchema[commonGaugeType] : undefined,
  );

  function isSectionExpanded(sectionId: string): boolean {
    return $inspectorStore.expandedSections[sectionId] ?? false;
  }

  function toggleSection(sectionId: string) {
    inspectorStore.toggleSection(sectionId);
  }

  function updateSingleWidget(updates: Partial<WidgetConfig>) {
    if (!selectedWidget) return;
    const widgetId = selectedWidget.id;
    const oldWidget = widgetUtils.getWidget(widgetId) ?? selectedWidget;
    const oldValues: Partial<WidgetConfig> = {};
    const oldValuesRecord = oldValues as Record<string, unknown>;
    for (const key of Object.keys(updates) as Array<keyof WidgetConfig>) {
      oldValuesRecord[key] = oldWidget?.[key];
    }
    historyStore.executeCommand(
      new UpdateWidgetCommand(
        widgetId,
        oldValues,
        updates,
        widgetUtils.updateWidget,
      ),
    );
  }

  function updateMultipleWidgets(
    updates: Partial<WidgetConfig>,
    description = "Update widgets",
  ) {
    if (selectedIds.length === 0) return;
    const commands: UpdateWidgetCommand[] = [];

    selectedIds.forEach((id) => {
      const widget = widgetUtils.getWidget(id);
      if (!widget) return;
      const oldValues: Partial<WidgetConfig> = {};
      const oldValuesRecord = oldValues as Record<string, unknown>;
      for (const key of Object.keys(updates) as Array<keyof WidgetConfig>) {
        oldValuesRecord[key] = widget[key];
      }
      commands.push(
        new UpdateWidgetCommand(
          id,
          oldValues,
          updates,
          widgetUtils.updateWidget,
        ),
      );
    });

    if (commands.length > 0) {
      historyStore.executeCommand(
        new BatchCommand(commands, `${description} (${commands.length})`),
      );
    }
  }

  function updateWidget(updates: Partial<WidgetConfig>) {
    if (isMultipleSelection) {
      updateMultipleWidgets(updates, "Update widgets");
    } else {
      updateSingleWidget(updates);
    }
  }

  function mergeGaugeSettings(widget: WidgetConfig, value: GaugeType) {
    const defaults = gaugeTypeMetadata[value].defaultSettings;
    return {
      ...defaults,
      color_primary:
        widget.gauge_settings.color_primary ?? defaults.color_primary,
    };
  }

  function updateGaugeType(value: GaugeType) {
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        const newGaugeSettings = mergeGaugeSettings(widget, value);
        commands.push(
          new UpdateWidgetCommand(
            id,
            {
              gauge_type: widget.gauge_type,
              gauge_settings: widget.gauge_settings,
            },
            { gauge_type: value, gauge_settings: newGaugeSettings },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, `Set gauge type to ${value}`),
        );
      }
    } else {
      if (!selectedWidget) return;
      const newGaugeSettings = mergeGaugeSettings(selectedWidget, value);
      updateSingleWidget({
        gauge_type: value,
        gauge_settings: newGaugeSettings,
      });
    }
  }

  function updateGaugeSettings<K extends keyof GaugeSettings>(
    key: K,
    value: GaugeSettings[K],
  ) {
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        const newSettings = { ...widget.gauge_settings, [key]: value };
        commands.push(
          new UpdateWidgetCommand(
            id,
            { gauge_settings: widget.gauge_settings },
            { gauge_settings: newSettings },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, `Update ${String(key)}`),
        );
      }
    } else {
      if (!selectedWidget) return;
      const newSettings = { ...selectedWidget.gauge_settings, [key]: value };
      updateSingleWidget({ gauge_settings: newSettings });
    }
  }

  function getSensorValue(sensorId: string | undefined): string {
    if (!sensorId) return "--";
    const data = $sensorData[sensorId];
    const value = data?.value;
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "--";
  }

  function copyWidgetId() {
    if (!selectedWidget) return;
    navigator.clipboard?.writeText(selectedWidget.id);
  }

  function handleSensorSelect(sensorId: string) {
    if (isMultipleSelection) {
      updateMultipleWidgets({ sensor_id: sensorId }, "Set sensor");
    } else {
      updateSingleWidget({ sensor_id: sensorId });
    }
  }

  function handleBulkLock(lock: boolean) {
    if (selectedIds.length === 0) return;
    const commands: UpdateWidgetCommand[] = [];
    selectedIds.forEach((id) => {
      const widget = widgetUtils.getWidget(id);
      if (!widget || widget.is_locked === lock) return;
      commands.push(
        new UpdateWidgetCommand(
          id,
          { is_locked: widget.is_locked },
          { is_locked: lock },
          widgetUtils.updateWidget,
        ),
      );
    });
    if (commands.length > 0) {
      historyStore.executeCommand(
        new BatchCommand(commands, lock ? "Lock widgets" : "Unlock widgets"),
      );
    }
  }

  function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const commands: RemoveWidgetCommand[] = [];
    selectedIds.forEach((id) => {
      const widget = widgetUtils.getWidget(id);
      if (!widget) return;
      commands.push(
        new RemoveWidgetCommand(
          widget,
          widgetUtils.addWidget,
          widgetUtils.removeWidget,
        ),
      );
    });
    if (commands.length > 0) {
      historyStore.executeCommand(
        new BatchCommand(
          commands,
          `Delete ${commands.length} widget${commands.length === 1 ? "" : "s"}`,
        ),
      );
    }
  }

  function handleBulkAlign(direction: "horizontal" | "vertical") {
    if (direction === "horizontal") {
      alignWidgets("align-center-horizontal");
    } else {
      alignWidgets("align-center-vertical");
    }
  }

  function handleBulkDistribute(direction: "horizontal" | "vertical") {
    distributeWidgets(
      direction === "horizontal"
        ? "distribute-horizontal"
        : "distribute-vertical",
    );
  }

  function handleBringToFront() {
    if (selectedIds.length === 0) return;
    const widgetsMap = get(widgets);
    const maxZ =
      Math.max(...Object.values(widgetsMap).map((w) => w.z_index), 0) + 1;
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id, index) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        commands.push(
          new UpdateWidgetCommand(
            id,
            { z_index: widget.z_index },
            { z_index: maxZ + index },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, "Bring widgets to front"),
        );
      }
    } else {
      updateSingleWidget({ z_index: maxZ });
    }
  }

  function handleSendToBack() {
    if (selectedIds.length === 0) return;
    const widgetsMap = get(widgets);
    const minZ =
      Math.min(...Object.values(widgetsMap).map((w) => w.z_index), 0) - 1;
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id, index) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        commands.push(
          new UpdateWidgetCommand(
            id,
            { z_index: widget.z_index },
            { z_index: minZ - index },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, "Send widgets to back"),
        );
      }
    } else {
      updateSingleWidget({ z_index: minZ });
    }
  }

  function getMixedValue<K extends keyof WidgetConfig>(
    key: K,
    transform: (value: WidgetConfig[K]) => string = (value) =>
      value?.toString() ?? "",
  ): { value: string; isMixed: boolean } {
    if (selectedWidgetsList.length === 0) return { value: "", isMixed: false };
    const firstValue = selectedWidgetsList[0][key];
    const isMixed = selectedWidgetsList.some(
      (w) => JSON.stringify(w[key]) !== JSON.stringify(firstValue),
    );
    return {
      value: isMixed ? "" : transform(firstValue),
      isMixed,
    };
  }

  function getMixedBooleanValue(key: keyof WidgetConfig): {
    value: boolean;
    isMixed: boolean;
    indeterminate: boolean;
  } {
    if (selectedWidgetsList.length === 0) {
      return { value: false, isMixed: false, indeterminate: false };
    }
    const firstValue = selectedWidgetsList[0][key];
    const isMixed = selectedWidgetsList.some(
      (w) => JSON.stringify(w[key]) !== JSON.stringify(firstValue),
    );
    const value = isMixed
      ? false
      : typeof firstValue === "boolean"
        ? firstValue
        : false;
    return { value, isMixed, indeterminate: isMixed };
  }

  function getMixedGaugeSettingValue<K extends keyof GaugeSettings>(
    key: K,
    transform: (value: GaugeSettings[K]) => string = (value) =>
      value?.toString() ?? "",
  ): { value: string; isMixed: boolean } {
    if (selectedWidgetsList.length === 0) return { value: "", isMixed: false };
    const firstValue = selectedWidgetsList[0].gauge_settings[key];
    const isMixed = selectedWidgetsList.some(
      (w) =>
        JSON.stringify(w.gauge_settings[key]) !== JSON.stringify(firstValue),
    );
    return {
      value: isMixed ? "" : transform(firstValue),
      isMixed,
    };
  }

  function handleMixedNumberInput(
    event: Event,
    update: (value: number) => void,
  ) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (!Number.isNaN(value)) {
      update(value);
    }
  }

  // Style overrides
  const stylePresets = [
    { key: "color_primary", label: "Primary", value: "var(--theme-primary)" },
    {
      key: "color_secondary",
      label: "Secondary",
      value: "var(--theme-secondary)",
    },
    { key: "color_accent", label: "Accent", value: "var(--theme-accent)" },
  ];

  function getStyleOverrides(): {
    key: string;
    value: string | number | boolean;
  }[] {
    if (selectedWidgetsList.length === 0) return [];
    const firstWidget = selectedWidgetsList[0];
    const firstKeys = Object.keys(firstWidget.style_settings);
    const commonKeys = firstKeys.filter((key) =>
      selectedWidgetsList.every((w) => {
        const value = w.style_settings[key];
        const firstValue = firstWidget.style_settings[key];
        return (
          value !== undefined &&
          JSON.stringify(value) === JSON.stringify(firstValue)
        );
      }),
    );
    return commonKeys.map((key) => {
      const value = firstWidget.style_settings[key];
      return { key, value: value ?? "" };
    });
  }

  function updateStyleOverrides(
    key: string,
    value: string | number | boolean | undefined,
  ) {
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        const newStyle: StyleSettings = { ...widget.style_settings };
        if (value === undefined) {
          delete newStyle[key];
        } else {
          newStyle[key] = value;
        }
        commands.push(
          new UpdateWidgetCommand(
            id,
            { style_settings: widget.style_settings },
            { style_settings: newStyle },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, "Update style overrides"),
        );
      }
    } else {
      if (!selectedWidget) return;
      const newStyle: StyleSettings = { ...selectedWidget.style_settings };
      if (value === undefined) {
        delete newStyle[key];
      } else {
        newStyle[key] = value;
      }
      updateSingleWidget({ style_settings: newStyle });
    }
  }

  function addStyleOverride() {
    updateStyleOverrides("new_override", "");
  }

  function removeStyleOverride(key: string) {
    updateStyleOverrides(key, undefined);
  }

  function handleStyleOverrideKeyChange(
    oldKey: string,
    newKey: string,
    value: string | number | boolean,
  ) {
    if (oldKey === newKey) return;
    if (isMultipleSelection) {
      const commands: UpdateWidgetCommand[] = [];
      selectedIds.forEach((id) => {
        const widget = widgetUtils.getWidget(id);
        if (!widget) return;
        const newStyle: StyleSettings = { ...widget.style_settings };
        delete newStyle[oldKey];
        newStyle[newKey] = value;
        commands.push(
          new UpdateWidgetCommand(
            id,
            { style_settings: widget.style_settings },
            { style_settings: newStyle },
            widgetUtils.updateWidget,
          ),
        );
      });
      if (commands.length > 0) {
        historyStore.executeCommand(
          new BatchCommand(commands, "Rename style override"),
        );
      }
    } else {
      if (!selectedWidget) return;
      const newStyle: StyleSettings = { ...selectedWidget.style_settings };
      delete newStyle[oldKey];
      newStyle[newKey] = value;
      updateSingleWidget({ style_settings: newStyle });
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="p-4 space-y-4" tabindex="0">
  {#if selectedWidgetsList.length === 0}
    <div class="text-center text-[var(--theme-text-muted)] py-8">
      <FileText size={48} class="mx-auto mb-3 opacity-50" />
      <p>Select a widget to configure its properties</p>
    </div>
  {:else}
    {#if isMultipleSelection}
      <BulkEditHeader
        count={selectionCount}
        onlock={() => handleBulkLock(true)}
        onunlock={() => handleBulkLock(false)}
        ondelete={handleBulkDelete}
        onalign={handleBulkAlign}
        ondistribute={handleBulkDistribute}
      />
    {/if}

    <!-- Basic Properties -->
    <CollapsibleSection
      title="Basic Properties"
      sectionId="basic"
      expanded={isSectionExpanded("basic")}
      ontoggle={toggleSection}
    >
      <div class="space-y-4 pt-2">
        <!-- Sensor Picker -->
        <div class="space-y-2">
          <label
            for="wi-sensor"
            class="block text-sm font-medium text-[var(--theme-text)]"
          >
            Sensor Data Source
          </label>
          <SensorPicker
            id="wi-sensor"
            selectedSensorId={selectedWidget?.sensor_id ?? ""}
            recentIds={$inspectorStore.recentSensors}
            favoriteIds={$inspectorStore.favoriteSensors}
            onselect={handleSensorSelect}
          />
        </div>

        <!-- Gauge Type -->
        <div class="space-y-2">
          <span class="block text-sm font-medium text-[var(--theme-text)]">
            Gauge Type
          </span>
          <div class="grid grid-cols-3 gap-2">
            {#each gaugeTypeOptions as gaugeType}
              {@const meta = gaugeTypeMetadata[gaugeType]}
              {@const isMixed =
                isMultipleSelection && commonGaugeType === undefined}
              {@const isActive =
                selectedWidget?.gauge_type === gaugeType ||
                (isMultipleSelection && commonGaugeType === gaugeType)}
              <button
                type="button"
                onclick={() => updateGaugeType(gaugeType)}
                class="p-2 rounded-md border text-xs text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] {isActive
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                  : 'border-[var(--theme-border)] hover:border-[var(--theme-primary)]'}"
                class:opacity-50={isMixed}
                title={meta.description}
              >
                <div class="font-medium text-[var(--theme-text)]">
                  {meta.label}
                </div>
                <div class="text-[10px] text-[var(--theme-text-muted)]">
                  {meta.defaultWidth}×{meta.defaultHeight}
                </div>
              </button>
            {/each}
          </div>
          {#if isMultipleSelection && hasMixedGaugeType}
            <p class="text-xs text-[var(--theme-text-muted)]">
              Mixed gauge types — select a type to apply to all widgets
            </p>
          {:else if selectedSensorInfo}
            <p class="text-xs text-[var(--theme-text-muted)]">
              Current value: {getSensorValue(selectedSensorInfo.id)}
              {selectedSensorInfo.unit}
            </p>
          {/if}
        </div>

        <!-- Widget ID (single only) -->
        {#if !isMultipleSelection && selectedWidget}
          <div class="space-y-1">
            <label
              for="wi-id"
              class="block text-xs text-[var(--theme-text-muted)]"
            >
              Widget ID
            </label>
            <div class="flex items-center gap-2">
              <input
                id="wi-id"
                type="text"
                readonly
                value={selectedWidget.id}
                class="flex-1 px-2 py-1 text-xs bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text-muted)]"
              />
              <button
                type="button"
                onclick={copyWidgetId}
                class="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                title="Copy widget ID"
                aria-label="Copy widget ID"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        {/if}
      </div>
    </CollapsibleSection>

    <!-- Display Options -->
    <CollapsibleSection
      title="Display Options"
      sectionId="display"
      expanded={isSectionExpanded("display")}
      ontoggle={toggleSection}
    >
      {@const showLabel = getMixedBooleanValue("show_label")}
      {@const customLabel = getMixedValue("custom_label")}
      {@const showUnit = getMixedBooleanValue("show_unit")}
      {@const customUnit = getMixedValue("custom_unit")}
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <label for="wi-show-label" class="text-sm text-[var(--theme-text)]">
            Show Label
          </label>
          <input
            id="wi-show-label"
            type="checkbox"
            class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
            checked={showLabel.value}
            indeterminate={showLabel.indeterminate}
            onchange={(e) =>
              updateWidget({ show_label: e.currentTarget.checked })}
          />
        </div>

        {#if !showLabel.isMixed && showLabel.value}
          <div class="space-y-1">
            <label
              for="wi-custom-label"
              class="block text-xs text-[var(--theme-text-muted)]"
            >
              Custom Label
            </label>
            <input
              id="wi-custom-label"
              type="text"
              value={customLabel.value}
              placeholder={customLabel.isMixed
                ? "Mixed values"
                : "Leave empty to use sensor name"}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                updateWidget({
                  custom_label: e.currentTarget.value || undefined,
                })}
            />
          </div>
        {/if}

        <div class="flex items-center justify-between">
          <label for="wi-show-unit" class="text-sm text-[var(--theme-text)]">
            Show Unit
          </label>
          <input
            id="wi-show-unit"
            type="checkbox"
            class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
            checked={showUnit.value}
            indeterminate={showUnit.indeterminate}
            onchange={(e) =>
              updateWidget({ show_unit: e.currentTarget.checked })}
          />
        </div>

        {#if !showUnit.isMixed && showUnit.value}
          <div class="space-y-1">
            <label
              for="wi-custom-unit"
              class="block text-xs text-[var(--theme-text-muted)]"
            >
              Custom Unit
            </label>
            <input
              id="wi-custom-unit"
              type="text"
              value={customUnit.value}
              placeholder={customUnit.isMixed
                ? "Mixed values"
                : "Leave empty to use sensor unit"}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                updateWidget({
                  custom_unit: e.currentTarget.value || undefined,
                })}
            />
          </div>
        {/if}
      </div>
    </CollapsibleSection>

    <!-- Layout -->
    <CollapsibleSection
      title="Layout"
      sectionId="layout"
      expanded={isSectionExpanded("layout")}
      ontoggle={toggleSection}
    >
      {@const posX = getMixedValue("pos_x")}
      {@const posY = getMixedValue("pos_y")}
      {@const width = getMixedValue("width")}
      {@const height = getMixedValue("height")}
      {@const rotation = getMixedValue("rotation")}
      {@const zIndex = getMixedValue("z_index")}
      {@const isLocked = getMixedBooleanValue("is_locked")}
      <div class="space-y-3 pt-2">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              for="wi-pos-x"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              X
            </label>
            <input
              id="wi-pos-x"
              type="number"
              value={posX.value}
              placeholder={posX.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ pos_x: value }),
                )}
            />
          </div>

          <div>
            <label
              for="wi-pos-y"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              Y
            </label>
            <input
              id="wi-pos-y"
              type="number"
              value={posY.value}
              placeholder={posY.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ pos_y: value }),
                )}
            />
          </div>

          <div>
            <label
              for="wi-width"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              Width
            </label>
            <input
              id="wi-width"
              type="number"
              min="20"
              value={width.value}
              placeholder={width.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ width: value }),
                )}
            />
          </div>

          <div>
            <label
              for="wi-height"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              Height
            </label>
            <input
              id="wi-height"
              type="number"
              min="20"
              value={height.value}
              placeholder={height.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ height: value }),
                )}
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              for="wi-rotation"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              Rotation (deg)
            </label>
            <input
              id="wi-rotation"
              type="number"
              min="-180"
              max="360"
              value={rotation.value}
              placeholder={rotation.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ rotation: value }),
                )}
            />
          </div>

          <div>
            <label
              for="wi-z-index"
              class="block text-xs text-[var(--theme-text-muted)] mb-1"
            >
              Z-Index
            </label>
            <input
              id="wi-z-index"
              type="number"
              value={zIndex.value}
              placeholder={zIndex.isMixed ? "Mixed" : undefined}
              class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              onchange={(e) =>
                handleMixedNumberInput(e, (value) =>
                  updateWidget({ z_index: value }),
                )}
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick={handleBringToFront}
            class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            Bring to Front
          </button>
          <button
            type="button"
            onclick={handleSendToBack}
            class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          >
            Send to Back
          </button>
        </div>

        <div class="flex items-center justify-between">
          <label for="wi-lock" class="text-sm text-[var(--theme-text)]">
            Lock Widget
          </label>
          <input
            id="wi-lock"
            type="checkbox"
            class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
            checked={isLocked.value}
            indeterminate={isLocked.indeterminate}
            onchange={(e) =>
              updateWidget({ is_locked: e.currentTarget.checked })}
          />
        </div>
        <p class="text-xs text-[var(--theme-text-muted)]">
          Locked widgets cannot be moved or resized in edit mode
        </p>
      </div>
    </CollapsibleSection>

    <!-- Gauge-Specific Settings -->
    {#if !hasMixedGaugeType}
      <CollapsibleSection
        title="Gauge-Specific Settings"
        sectionId="gauge"
        badge={isMultipleSelection ? undefined : selectedWidget?.gauge_type}
        expanded={isSectionExpanded("gauge")}
        ontoggle={toggleSection}
      >
        <div class="space-y-3 pt-2">
          {#if gaugeSchema?.fields}
            {@const fields = gaugeSchema.fields || []}
            {#each fields as field}
              {@const mixedValue = getMixedGaugeSettingValue(field.key)}
              {@const value = mixedValue.value}
              {@const isMixed = mixedValue.isMixed}
              <div class="space-y-1">
                <label
                  for="wi-{field.key}"
                  class="block text-xs text-[var(--theme-text-muted)]"
                >
                  {field.label}
                </label>
                {#if field.type === "number"}
                  <input
                    id="wi-{field.key}"
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? "any"}
                    {value}
                    placeholder={isMixed ? "Mixed values" : undefined}
                    class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                    onchange={(e) =>
                      handleMixedNumberInput(e, (val) =>
                        updateGaugeSettings(field.key, val),
                      )}
                  />
                {:else if field.type === "boolean"}
                  <div class="flex items-center">
                    <input
                      id="wi-{field.key}"
                      type="checkbox"
                      class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                      checked={value === "true"}
                      onchange={(e) =>
                        updateGaugeSettings(field.key, e.currentTarget.checked)}
                    />
                    <span class="ml-2 text-sm text-[var(--theme-text)]">
                      {value === "true" ? "On" : "Off"}
                    </span>
                  </div>
                {:else if field.type === "select"}
                  <select
                    id="wi-{field.key}"
                    {value}
                    class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                    onchange={(e) =>
                      updateGaugeSettings(
                        field.key,
                        e.currentTarget
                          .value as GaugeSettings[typeof field.key],
                      )}
                  >
                    {#each field.options || [] as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {:else if field.type === "color"}
                  <ColorPicker
                    id="wi-{field.key}"
                    {value}
                    placeholder={isMixed
                      ? "Mixed values"
                      : "var(--theme-primary)"}
                    onchange={(newValue: string) =>
                      updateGaugeSettings(field.key, newValue)}
                  />
                {:else if field.type === "textarea"}
                  <textarea
                    id="wi-{field.key}"
                    rows="3"
                    {value}
                    placeholder={isMixed ? "Mixed values" : undefined}
                    class="w-full px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                    onchange={(e) =>
                      updateGaugeSettings(
                        field.key,
                        field.key === "image_sequence"
                          ? parseImageSequenceInput(e.currentTarget.value)
                          : e.currentTarget.value,
                      )}
                  ></textarea>
                {/if}
              </div>
            {/each}
          {:else}
            <p class="text-sm text-[var(--theme-text-muted)]">
              No gauge-specific settings available
            </p>
          {/if}
        </div>
      </CollapsibleSection>
    {:else if isMultipleSelection}
      <div
        class="p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)]"
      >
        <p class="text-sm text-[var(--theme-text-muted)]">
          Gauge-specific settings are hidden because selected widgets have
          different gauge types.
        </p>
      </div>
    {/if}

    <!-- Style Overrides -->
    <CollapsibleSection
      title="Style Overrides"
      sectionId="style"
      expanded={isSectionExpanded("style")}
      ontoggle={toggleSection}
    >
      <div class="space-y-3 pt-2">
        <!-- Presets -->
        <div class="flex flex-wrap gap-2">
          {#each stylePresets as preset}
            <button
              type="button"
              onclick={() => updateStyleOverrides(preset.key, preset.value)}
              class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              Use {preset.label}
            </button>
          {/each}
        </div>

        <!-- Overrides list -->
        <div class="space-y-2">
          {#each getStyleOverrides() as override (override.key)}
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={override.key}
                placeholder="Key"
                class="flex-1 px-2 py-1 text-xs bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                onchange={(e) =>
                  handleStyleOverrideKeyChange(
                    override.key,
                    e.currentTarget.value,
                    override.value,
                  )}
              />
              <input
                type="text"
                value={override.value.toString()}
                placeholder="Value"
                class="flex-1 px-2 py-1 text-xs bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                onchange={(e) =>
                  updateStyleOverrides(override.key, e.currentTarget.value)}
              />
              <button
                type="button"
                onclick={() => removeStyleOverride(override.key)}
                class="p-1 rounded text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)]"
                aria-label="Remove style override"
              >
                <Trash2 size={14} />
              </button>
            </div>
          {:else}
            <p class="text-sm text-[var(--theme-text-muted)]">
              No style overrides set
            </p>
          {/each}
        </div>

        <button
          type="button"
          onclick={addStyleOverride}
          class="w-full px-2 py-1 text-xs rounded border border-dashed border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:border-[var(--theme-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        >
          + Add Style Override
        </button>
      </div>
    </CollapsibleSection>
  {/if}
</div>
