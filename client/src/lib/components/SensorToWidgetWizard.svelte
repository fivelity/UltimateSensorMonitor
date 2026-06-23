<script lang="ts">
  import {
    gaugeTypeMetadata,
    gaugeTypeOptions,
    getDefaultGaugeType,
  } from "$lib/constants/gauges";
  import {
    availableSensors,
    inspectorStore,
    sensorData,
    widgetUtils,
  } from "$lib/stores";
  import { AddWidgetCommand, historyStore } from "$lib/stores/history";
  import type { GaugeType, WidgetConfig } from "$lib/types";
  import { Check, ChevronLeft, ChevronRight, X } from "@lucide/svelte";
  import SensorPicker from "./SensorPicker.svelte";

  interface Props {
    onclose?: () => void;
  }

  const { onclose }: Props = $props();

  type WizardStep = "sensor" | "gauge" | "configure" | "place";

  let currentStep = $state<WizardStep>("sensor");
  let selectedSensorId = $state<string>("");
  let selectedGaugeType = $state<GaugeType>("text");
  let customLabel = $state<string>("");
  let customUnit = $state<string>("");
  let selectedColor = $state<string>("var(--theme-primary)");
  let width = $state<number>(200);
  let height = $state<number>(120);
  let placementMode = $state<"center" | "pointer">("center");
  let pointerPosition = $state<{ x: number; y: number } | null>(null);

  const selectedSensor = $derived(
    $availableSensors.find((s) => s.id === selectedSensorId) || null,
  );

  const canProceed = $derived(() => {
    switch (currentStep) {
      case "sensor":
        return Boolean(selectedSensorId);
      case "gauge":
        return Boolean(selectedGaugeType);
      case "configure":
      case "place":
        return true;
    }
  });

  function formatValue(value: number | string | undefined): string {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return value?.toString() || "--";
  }

  function selectSensor(sensorId: string) {
    selectedSensorId = sensorId;
    const sensor = $availableSensors.find((s) => s.id === sensorId);
    if (sensor) {
      selectedGaugeType = getDefaultGaugeType(sensor.category);
      const meta = gaugeTypeMetadata[selectedGaugeType];
      width = meta.defaultWidth;
      height = meta.defaultHeight;
      selectedColor =
        (meta.defaultSettings.color_primary as string) ||
        "var(--theme-primary)";
    }
  }

  function selectGauge(gaugeType: GaugeType) {
    selectedGaugeType = gaugeType;
    const meta = gaugeTypeMetadata[gaugeType];
    width = meta.defaultWidth;
    height = meta.defaultHeight;
  }

  function getPlacementPosition(): { x: number; y: number } {
    if (placementMode === "pointer" && pointerPosition) {
      return pointerPosition;
    }
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    return {
      x: Math.max(0, Math.round(viewportWidth / 2 - width / 2)),
      y: Math.max(0, Math.round(viewportHeight / 2 - height / 2)),
    };
  }

  function createWidget() {
    if (!selectedSensor) return;

    const position = getPlacementPosition();
    const meta = gaugeTypeMetadata[selectedGaugeType];

    const widget: WidgetConfig = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sensor_id: selectedSensor.id,
      gauge_type: selectedGaugeType,
      pos_x: position.x,
      pos_y: position.y,
      width,
      height,
      rotation: 0,
      z_index: 1,
      is_locked: false,
      show_label: true,
      show_unit: true,
      gauge_settings: {
        ...meta.defaultSettings,
        color_primary: selectedColor,
      },
      style_settings: {},
      custom_label: customLabel || undefined,
      custom_unit: customUnit || undefined,
    };

    historyStore.executeCommand(
      new AddWidgetCommand(
        widget,
        widgetUtils.addWidget,
        widgetUtils.removeWidget,
      ),
    );

    inspectorStore.addRecentSensor(selectedSensor.id);
    onclose?.();
  }

  function handlePointerPlacement() {
    const handler = (event: MouseEvent) => {
      pointerPosition = { x: event.clientX, y: event.clientY };
      createWidget();
      window.removeEventListener("click", handler);
    };
    window.addEventListener("click", handler);
  }

  function nextStep() {
    if (!canProceed()) return;
    switch (currentStep) {
      case "sensor":
        currentStep = "gauge";
        break;
      case "gauge":
        currentStep = "configure";
        break;
      case "configure":
        currentStep = "place";
        break;
      case "place":
        createWidget();
        break;
    }
  }

  function previousStep() {
    switch (currentStep) {
      case "gauge":
        currentStep = "sensor";
        break;
      case "configure":
        currentStep = "gauge";
        break;
      case "place":
        currentStep = "configure";
        break;
      case "sensor":
        break;
    }
  }

  function stepTitle(step: WizardStep): string {
    switch (step) {
      case "sensor":
        return "Select Sensor";
      case "gauge":
        return "Choose Gauge";
      case "configure":
        return "Configure";
      case "place":
        return "Place";
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onclose?.();
    }
  }

  function colorOptions(): { id: string; css: string }[] {
    return [
      { id: "primary", css: "var(--theme-primary)" },
      { id: "secondary", css: "var(--theme-secondary)" },
      { id: "accent", css: "var(--theme-accent)" },
      { id: "danger", css: "var(--theme-danger)" },
      { id: "success", css: "var(--theme-success)" },
      { id: "warning", css: "var(--theme-warning)" },
    ];
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-[var(--theme-background)]/60 backdrop-blur-sm flex items-center justify-center z-50"
  onclick={handleBackdropClick}
>
  <div
    class="bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]"
    role="dialog"
    aria-modal="true"
    aria-label="Sensor to widget wizard"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border)]"
    >
      <div>
        <h2 class="text-lg font-semibold text-[var(--theme-text)]">
          Add Widget
        </h2>
        <p class="text-sm text-[var(--theme-text-muted)]">
          Step {stepTitle(currentStep)}
        </p>
      </div>
      <button
        type="button"
        onclick={() => onclose?.()}
        class="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        aria-label="Close wizard"
      >
        <X size={20} />
      </button>
    </div>

    <!-- Step indicator -->
    <div
      class="px-6 py-3 flex items-center gap-2 border-b border-[var(--theme-border)] bg-[var(--theme-background)]/50"
    >
      {#each ["sensor", "gauge", "configure", "place"] as step, index}
        {@const isActive = step === currentStep}
        {@const isPast =
          ["sensor", "gauge", "configure", "place"].indexOf(currentStep) >
          index}
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
            class:bg-[var(--theme-primary)]={isActive || isPast}
            class:text-[var(--theme-background)]={isActive || isPast}
            class:bg-[var(--theme-border)]={!isActive && !isPast}
            class:text-[var(--theme-text-muted)]={!isActive && !isPast}
          >
            {#if isPast}
              <Check size={12} />
            {:else}
              {index + 1}
            {/if}
          </div>
          <span
            class="text-xs"
            class:text-[var(--theme-text)]={isActive || isPast}
            class:text-[var(--theme-text-muted)]={!isActive && !isPast}
          >
            {stepTitle(step as WizardStep)}
          </span>
        </div>
        {#if index < 3}
          <div class="w-6 h-px bg-[var(--theme-border)]"></div>
        {/if}
      {/each}
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      {#if currentStep === "sensor"}
        <div class="space-y-4">
          <p class="text-sm text-[var(--theme-text-muted)]">
            Choose a sensor to display. Recently used and favorite sensors
            appear at the top.
          </p>
          <SensorPicker
            {selectedSensorId}
            recentIds={$inspectorStore.recentSensors}
            favoriteIds={$inspectorStore.favoriteSensors}
            onselect={selectSensor}
            onclose={() => onclose?.()}
          />
        </div>
      {:else if currentStep === "gauge"}
        <div class="space-y-4">
          <p class="text-sm text-[var(--theme-text-muted)]">
            Select a gauge type for {selectedSensor?.name}.
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {#each gaugeTypeOptions as gaugeType}
              {@const meta = gaugeTypeMetadata[gaugeType]}
              {@const isSelected = selectedGaugeType === gaugeType}
              <button
                type="button"
                onclick={() => selectGauge(gaugeType)}
                class="p-4 rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] {isSelected
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                  : 'border-[var(--theme-border)] hover:border-[var(--theme-primary)]'}"
              >
                <div class="text-sm font-medium text-[var(--theme-text)]">
                  {meta.label}
                </div>
                <div class="text-xs text-[var(--theme-text-muted)] mt-1">
                  {meta.description}
                </div>
                <div class="text-xs text-[var(--theme-text-muted)] mt-2">
                  Default size: {meta.defaultWidth}×{meta.defaultHeight}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {:else if currentStep === "configure"}
        <div class="space-y-4">
          <p class="text-sm text-[var(--theme-text-muted)]">
            Customize the widget for {selectedSensor?.name}.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-[var(--theme-text-muted)] mb-1"
                >Label</label
              >
              <input
                type="text"
                bind:value={customLabel}
                placeholder={selectedSensor?.name || "Sensor label"}
                class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-sm text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-[var(--theme-text-muted)] mb-1"
                >Unit</label
              >
              <input
                type="text"
                bind:value={customUnit}
                placeholder={selectedSensor?.unit || "Unit"}
                class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-sm text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-[var(--theme-text-muted)] mb-1"
                >Width</label
              >
              <input
                type="number"
                bind:value={width}
                min={50}
                max={1000}
                class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-sm text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-[var(--theme-text-muted)] mb-1"
                >Height</label
              >
              <input
                type="number"
                bind:value={height}
                min={50}
                max={1000}
                class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-sm text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs text-[var(--theme-text-muted)] mb-2"
              >Primary Color</label
            >
            <div class="flex items-center gap-2 flex-wrap">
              {#each colorOptions() as color}
                <button
                  type="button"
                  onclick={() => (selectedColor = color.css)}
                  class="w-8 h-8 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:ring-[var(--theme-primary)]"
                  class:border-[var(--theme-border)]={selectedColor !==
                    color.css}
                  class:border-[var(--theme-text)]={selectedColor === color.css}
                  class:scale-110={selectedColor === color.css}
                  style="background: {color.css};"
                  title={color.id}
                  aria-label="Select color {color.id}"
                ></button>
              {/each}
            </div>
          </div>

          <!-- Live preview -->
          <div
            class="rounded-lg border border-[var(--theme-border)] p-4 bg-[var(--theme-background)]"
          >
            <div class="text-xs text-[var(--theme-text-muted)] mb-2">
              Preview
            </div>
            <div
              class="rounded-md flex items-center justify-center p-4"
              style="background: {selectedColor}; color: var(--theme-background);"
            >
              <div class="text-center">
                <div class="text-sm font-medium">
                  {customLabel || selectedSensor?.name || "Widget"}
                </div>
                <div class="text-2xl font-bold">
                  {formatValue(
                    selectedSensor
                      ? $sensorData[selectedSensor.id]?.value
                      : undefined,
                  )}
                </div>
                <div class="text-xs">
                  {customUnit || selectedSensor?.unit || ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if currentStep === "place"}
        <div class="space-y-4">
          <p class="text-sm text-[var(--theme-text-muted)]">
            Choose where to place the widget on the canvas.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              onclick={() => (placementMode = "center")}
              class="p-4 rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] {placementMode ===
              'center'
                ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                : 'border-[var(--theme-border)]'}"
            >
              <div class="text-sm font-medium text-[var(--theme-text)]">
                Center of Canvas
              </div>
              <div class="text-xs text-[var(--theme-text-muted)] mt-1">
                Place at {Math.round(
                  (window.innerWidth || 1200) / 2 - width / 2,
                )}, {Math.round((window.innerHeight || 800) / 2 - height / 2)}
              </div>
            </button>
            <button
              type="button"
              onclick={() => (placementMode = "pointer")}
              class="p-4 rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] {placementMode ===
              'pointer'
                ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                : 'border-[var(--theme-border)]'}"
            >
              <div class="text-sm font-medium text-[var(--theme-text)]">
                Click to Place
              </div>
              <div class="text-xs text-[var(--theme-text-muted)] mt-1">
                Click anywhere on the canvas after closing the wizard
              </div>
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div
      class="flex items-center justify-between px-6 py-4 border-t border-[var(--theme-border)] bg-[var(--theme-background)]/50"
    >
      <button
        type="button"
        onclick={() => onclose?.()}
        class="px-4 py-2 text-sm text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      >
        Cancel
      </button>
      <div class="flex items-center gap-2">
        {#if currentStep !== "sensor"}
          <button
            type="button"
            onclick={previousStep}
            class="px-4 py-2 text-sm text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        {/if}
        <button
          type="button"
          onclick={currentStep === "place" && placementMode === "pointer"
            ? handlePointerPlacement
            : nextStep}
          disabled={!canProceed()}
          class="px-4 py-2 text-sm bg-[var(--theme-primary)] text-[var(--theme-background)] rounded-md hover:opacity-90 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
        >
          {#if currentStep === "place"}
            {placementMode === "pointer" ? "Click to Place" : "Create Widget"}
          {:else}
            Next
            <ChevronRight size={16} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
