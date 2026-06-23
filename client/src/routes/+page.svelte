<script lang="ts">
  import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import DashboardCanvas from "$lib/components/DashboardCanvas.svelte";
  import LeftSidebar from "$lib/components/LeftSidebar.svelte";
  import RightSidebar from "$lib/components/RightSidebar.svelte";
  import TopBar from "$lib/components/TopBar.svelte";
  import { apiService } from "$lib/services/api";
  import { configService, type AppConfig } from "$lib/services/configService";
  import {
    availableSensors,
    contextMenu,
    editMode,
    selectedWidgets,
    sensorUtils,
    uiUtils,
    visualSettings,
    visualUtils,
    widgetArray,
  } from "$lib/stores";
  import { widgetUtils } from "$lib/stores/data/widgets";
  import type { GaugeSettings, GaugeType, WidgetConfig } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import { onMount } from "svelte";

  let showLeftSidebar = $state(false);
  let showRightSidebar = $state(false);
  let hasInitialized = $state(false);
  let leftSidebarComponent: {
    findSensorInSidebar: (_sensorId: string) => void;
  } | null = $state(null);
  let config: AppConfig | null = $state(null);
  let initializationError: string | null = $state(null);

  onMount(() => {
    let cancelled = false;
    let keydownHandler: ((_event: KeyboardEvent) => void) | null = null;

    // Safety timeout: ensure the loading screen never gets stuck indefinitely,
    // even if an API call hangs or an unexpected error occurs.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled && !hasInitialized && !initializationError) {
        logger.warn("[App] Initialization timed out after 15s, showing app");
        hasInitialized = true;
      }
    }, 15000);

    (async () => {
      try {
        // Load configuration first
        config = await configService.loadConfig();
        if (cancelled) return;
        logger.debug("[App] Configuration loaded:", config);

        // Set UI defaults from config
        showLeftSidebar = config.ui.autoOpenLeftSidebar;
        showRightSidebar = config.ui.autoOpenRightSidebar;
        editMode.set(config.ui.defaultEditMode);

        // Initialize visual settings from config
        visualUtils.updateSettings({
          grid_size: config.canvas.defaultGridSize,
          snap_to_grid: config.canvas.defaultSnapToGrid,
          show_grid: config.canvas.defaultShowGrid,
        });

        // Start application initialization
        await initializeApplication();
      } catch (error) {
        if (cancelled) return;
        logger.error("[App] Initialization failed:", error);
        initializationError =
          error instanceof Error
            ? error.message
            : "Unknown initialization error";
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimeout);
          // Ensure hasInitialized is always set, even if initializeApplication
          // returned early due to a null config or other edge case.
          if (!hasInitialized && !initializationError) {
            hasInitialized = true;
          }
        }

        // Set up keyboard shortcuts
        keydownHandler = setupKeyboardShortcuts();
        document.addEventListener("keydown", keydownHandler);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      if (keydownHandler) {
        document.removeEventListener("keydown", keydownHandler);
      }
    };
  });

  async function initializeApplication() {
    logger.debug("[App] Starting application initialization...");

    if (!config) return;

    // Check if demo data should be used (explicit config option)
    if (config.data.useDemoData) {
      logger.debug("[App] Demo mode enabled - loading demo data");
      await loadDemoData();
      hasInitialized = true;
      return;
    }

    // Attempt to load real sensor data
    logger.debug("[App] Attempting to load real sensor data...");
    try {
      const sensorsResult = await apiService.getSensors();

      if (sensorsResult.success && sensorsResult.data?.sources) {
        logger.debug("[App] Real sensor data loaded successfully");
        sensorUtils.updateSensorSources(sensorsResult.data.sources);

        // Wait for reactive stores to update, then create widgets if configured
        if (config.data.autoCreateWidgets) {
          setTimeout(() => {
            createInitialWidgetsFromSensors();
          }, 100);
        }
      } else {
        logger.warn("[App] Failed to load sensor data:", sensorsResult.error);
        showEmptyState();
      }
    } catch (error) {
      logger.error("[App] Error loading sensor data:", error);
      showEmptyState();
    }

    hasInitialized = true;
  }

  async function loadDemoData() {
    logger.debug("[App] Loading demo data...");
    const { demoSensorSources, demoSensorData, demoWidgets } =
      await import("$lib/demoData");

    sensorUtils.updateSensorSources(demoSensorSources);
    sensorUtils.updateSensorData(demoSensorData);

    demoWidgets.forEach((widget) => {
      widgetUtils.addWidget(widget);
    });

    logger.debug(`[App] Demo data loaded: ${demoWidgets.length} widgets`);
  }

  function showEmptyState() {
    logger.debug("[App] Showing empty state - no sensor data available");
    sensorUtils.updateSensorSources({});
    sensorUtils.updateSensorData({});
    widgetUtils.clearAllWidgets();
  }

  function createInitialWidgetsFromSensors() {
    const sensors = $availableSensors;

    if (!config || !sensors || sensors.length === 0) {
      logger.debug("[App] No sensors available for widget creation");
      return;
    }

    logger.debug(
      `[App] Creating initial widgets from ${sensors.length} available sensors`,
    );

    const sensorsByCategory = sensors.reduce(
      (acc, sensor) => {
        if (!acc[sensor.category]) {
          acc[sensor.category] = [];
        }
        acc[sensor.category].push(sensor);
        return acc;
      },
      {} as Record<string, typeof sensors>,
    );

    const widgetConfig = config.widgets;
    let currentX = 50;
    let currentY = 50;

    const advancePosition = () => {
      currentX += widgetConfig.widgetSpacing;
      if (currentX > window.innerWidth - widgetConfig.defaultWidgetWidth) {
        currentX = 50;
        currentY += widgetConfig.widgetRowHeight;
      }
    };

    Object.entries(sensorsByCategory).forEach(([category, categorySensors]) => {
      const maxWidgets = config!.data.maxWidgetsPerCategory;
      const sensorsToUse = categorySensors.slice(0, maxWidgets);

      sensorsToUse.forEach((sensor) => {
        const widget: WidgetConfig = {
          id: `${category}_widget_${sensor.id}`,
          sensor_id: sensor.id,
          gauge_type: getDefaultGaugeType(category),
          pos_x: currentX,
          pos_y: currentY,
          width: widgetConfig.defaultWidgetWidth,
          height: widgetConfig.defaultWidgetHeight,
          rotation: 0,
          z_index: 1,
          is_locked: false,
          show_label: true,
          show_unit: true,
          gauge_settings: getDefaultGaugeSettings(category),
          style_settings: {},
        };

        logger.debug(`[App] Created ${category} widget:`, widget.id);
        widgetUtils.addWidget(widget);
        advancePosition();
      });
    });

    logger.debug(`[App] Created ${$widgetArray.length} initial widgets`);
  }

  function getDefaultGaugeType(category: string): GaugeType {
    switch (category.toLowerCase()) {
      case "temperature":
        return "radial";
      case "usage":
      case "load":
        return "linear";
      case "power":
        return "text";
      case "fan":
        return "radial";
      default:
        return "text";
    }
  }

  function getDefaultGaugeSettings(category: string): GaugeSettings {
    switch (category.toLowerCase()) {
      case "temperature":
        return {
          start_angle: 0,
          end_angle: 270,
          color_primary: "#ef4444",
          stroke_width: 8,
        };
      case "usage":
      case "load":
        return { orientation: "horizontal", color_primary: "#10b981" };
      case "fan":
        return {
          start_angle: 45,
          end_angle: 315,
          color_primary: "#f59e0b",
          stroke_width: 6,
        };
      default:
        return {};
    }
  }

  function setupKeyboardShortcuts(): (_event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        uiUtils.clearSelection();
        uiUtils.hideContextMenu();
      }

      if (
        (event.key === "e" || event.key === "E") &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        editMode.update((mode) => (mode === "edit" ? "view" : "edit"));
      }

      if (event.key === "Delete" && $editMode === "edit") {
        const selection = $selectedWidgets;
        if (selection.type === "widget" && selection.ids.length > 0) {
          selection.ids.forEach((id) => widgetUtils.removeWidget(id));
          uiUtils.clearSelection();
        }
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "a" &&
        $editMode === "edit"
      ) {
        event.preventDefault();
        const allWidgetIds = $widgetArray.map((w) => w.id);
        if (allWidgetIds.length > 0) {
          selectedWidgets.set({ type: "widget", ids: allWidgetIds });
        }
      }
    };
  }

  function toggleLeftSidebar() {
    showLeftSidebar = !showLeftSidebar;
  }

  function toggleRightSidebar() {
    showRightSidebar = !showRightSidebar;
  }

  function handleDocumentClick(event: MouseEvent) {
    if ($contextMenu.show) {
      const target = event.target as Element;
      if (!target.closest(".context-menu")) {
        uiUtils.hideContextMenu();
      }
    }
  }

  function handleFindInSidebar(sensorId: string) {
    logger.debug("[App] Looking for sensor in sidebar:", sensorId);

    if (!showLeftSidebar) {
      showLeftSidebar = true;
    }

    setTimeout(() => {
      leftSidebarComponent?.findSensorInSidebar(sensorId);
    }, 100);
  }
</script>

<svelte:document onclick={handleDocumentClick} />

{#if initializationError}
  <div class="flex items-center justify-center h-screen bg-red-50">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-red-800 mb-4">Initialization Error</h1>
      <p class="text-red-600 mb-4">{initializationError}</p>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        onclick={() => window.location.reload()}
      >
        Reload Application
      </button>
    </div>
  </div>
{:else if !hasInitialized}
  <div
    class="flex items-center justify-center h-screen bg-[var(--theme-background)]"
  >
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)] mx-auto mb-4"
      ></div>
      <p class="text-[var(--theme-text-muted)]">
        Loading Ultimate Sensor Monitor...
      </p>
    </div>
  </div>
{:else}
  <div
    class="flex flex-col h-screen overflow-hidden bg-[var(--theme-background)]"
  >
    <!-- Top Bar -->
    <TopBar
      ontoggleLeftSidebar={toggleLeftSidebar}
      ontoggleRightSidebar={toggleRightSidebar}
      {showLeftSidebar}
      {showRightSidebar}
    />

    <!-- Main Content Area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      {#if showLeftSidebar}
        <div
          class="w-80 border-r border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300"
        >
          <LeftSidebar
            bind:this={leftSidebarComponent}
            onclose={() => (showLeftSidebar = false)}
          />
        </div>
      {/if}

      <!-- Dashboard Canvas -->
      <div class="flex-1 relative overflow-hidden">
        <DashboardCanvas />

        <!-- Empty state when no widgets are present -->
        {#if $widgetArray.length === 0 && hasInitialized}
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center text-[var(--theme-text-muted)]">
              <div class="text-6xl mb-4">📊</div>
              <h2 class="text-xl font-semibold mb-2">No Widgets Yet</h2>
              <p class="mb-4">
                {#if config?.data.useDemoData}
                  Demo mode is enabled but no demo widgets were loaded.
                {:else if !$availableSensors.length}
                  No sensor data available. Check your backend connection.
                {:else}
                  Drag sensors from the left sidebar to create widgets.
                {/if}
              </p>
              <div class="flex gap-2 justify-center">
                {#if !showLeftSidebar}
                  <button
                    class="px-4 py-2 bg-[var(--theme-primary)] text-white rounded hover:opacity-80"
                    onclick={toggleLeftSidebar}
                  >
                    Open Sensor Panel
                  </button>
                {/if}
                <button
                  class="px-4 py-2 border border-[var(--theme-border)] rounded hover:bg-[var(--theme-surface)]"
                  onclick={() => editMode.set("edit")}
                >
                  Enter Edit Mode
                </button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Grid overlay when in edit mode and grid is enabled -->
        {#if $editMode === "edit" && $visualSettings.show_grid}
          <div
            class="absolute inset-0 pointer-events-none micro-grid opacity-30"
          ></div>
        {/if}
      </div>

      <!-- Right Sidebar -->
      {#if showRightSidebar}
        <div
          class="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300"
        >
          <RightSidebar onclose={() => (showRightSidebar = false)} />
        </div>
      {/if}
    </div>

    <!-- Context Menu -->
    {#if $contextMenu.show}
      <ContextMenu
        x={$contextMenu.x}
        y={$contextMenu.y}
        target={$contextMenu.target}
        onfindInSidebar={handleFindInSidebar}
      />
    {/if}

    <!-- Connection Status Indicator -->
    <ConnectionStatus />
  </div>
{/if}
