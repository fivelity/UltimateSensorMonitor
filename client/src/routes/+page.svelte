<script lang="ts">
  import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import DashboardCanvas from "$lib/components/DashboardCanvas.svelte";
  import FloatingToolbar from "$lib/components/FloatingToolbar.svelte";
  import LeftSidebar from "$lib/components/LeftSidebar.svelte";
  import RightSidebar from "$lib/components/RightSidebar.svelte";
  import SensorToWidgetWizard from "$lib/components/SensorToWidgetWizard.svelte";
  import TopBar from "$lib/components/TopBar.svelte";
  import { apiService } from "$lib/services/api";
  import { configService, type AppConfig } from "$lib/services/configService";
  import {
    availableSensors,
    contextMenu,
    inspectorStore,
    sensorUtils,
    showLeftSidebar,
    showRightSidebar,
    uiUtils,
    visualUtils,
    widgetArray,
  } from "$lib/stores";
  import { widgetUtils } from "$lib/stores/data/widgets";
  import type {
    Bounds,
    GaugeSettings,
    GaugeType,
    WidgetConfig,
  } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import { RefreshCw } from "@lucide/svelte";
  import { onMount } from "svelte";

  let showWizard = $state(false);
  let hasInitialized = $state(false);
  let leftSidebarComponent: {
    findSensorInSidebar: (_sensorId: string) => void;
  } | null = $state(null);
  let dashboardCanvas: {
    scrollToBounds: (_bounds: Bounds) => void;
  } | null = $state(null);
  let config: AppConfig | null = $state(null);
  let initializationError: string | null = $state(null);

  onMount(() => {
    let cancelled = false;

    // Safety timeout: ensure the loading screen never gets stuck indefinitely,
    // even if an API call hangs or an unexpected error occurs.
    // Set to 60s to match the sensor API timeout rather than firing early.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled && !hasInitialized && !initializationError) {
        logger.warn("[App] Initialization timed out after 60s, showing app");
        hasInitialized = true;
      }
    }, 60000);

    (async () => {
      try {
        // Load configuration first
        config = await configService.loadConfig();
        if (cancelled) return;
        logger.debug("[App] Configuration loaded:", config);

        // Set UI defaults from config
        uiUtils.setLeftSidebar(config.ui.autoOpenLeftSidebar);
        uiUtils.setRightSidebar(config.ui.autoOpenRightSidebar);

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
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
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
      let sensorsResult: Awaited<ReturnType<typeof apiService.getSensors>>;
      let retries = 3;

      while (retries > 0) {
        sensorsResult = await apiService.getSensors();

        if (sensorsResult.success && sensorsResult.data?.sources) {
          const hasActive = Object.values(sensorsResult.data.sources).some(
            (s) => s.active,
          );
          if (hasActive || retries === 1) break;
          logger.debug(
            `[App] No active sensors yet, retrying... (${retries - 1} attempts left)`,
          );
        }
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 3000));
      }

      if (sensorsResult!.success && sensorsResult!.data?.sources) {
        logger.debug("[App] Real sensor data loaded successfully");
        sensorUtils.updateSensorSources(sensorsResult!.data.sources);

        // Wait for reactive stores to update, then create widgets if configured
        if (config.data.autoCreateWidgets) {
          setTimeout(() => {
            createInitialWidgetsFromSensors();
          }, 100);
        }
      } else {
        logger.warn("[App] Failed to load sensor data:", sensorsResult!.error);
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
          stroke_width: 8,
        };
      case "usage":
      case "load":
        return { orientation: "horizontal" };
      case "fan":
        return {
          start_angle: 45,
          end_angle: 315,
          stroke_width: 6,
        };
      default:
        return {};
    }
  }

  function openWizard() {
    showWizard = true;
  }

  function closeWizard() {
    showWizard = false;
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

    if (!$showLeftSidebar) {
      uiUtils.setLeftSidebar(true);
    }

    setTimeout(() => {
      leftSidebarComponent?.findSensorInSidebar(sensorId);
    }, 100);
  }

  function handleLocateGroup(bounds: Bounds) {
    logger.debug("[App] Locating group bounds:", bounds);
    dashboardCanvas?.scrollToBounds(bounds);
  }
</script>

<svelte:document onclick={handleDocumentClick} />

{#if initializationError}
  <div
    class="flex items-center justify-center h-screen bg-[var(--theme-background)]"
  >
    <div class="text-center">
      <h1 class="text-2xl font-bold text-[var(--theme-danger)] mb-4">
        Initialization Error
      </h1>
      <p class="text-[var(--theme-danger)] mb-4">{initializationError}</p>
      <button
        class="px-4 py-2 bg-[var(--theme-danger)] text-[var(--theme-background)] rounded hover:opacity-80 flex items-center gap-2 mx-auto"
        onclick={() => window.location.reload()}
      >
        <RefreshCw size={16} />
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
    <!-- Top Bar (slim, glassmorphic) -->
    <TopBar />

    <!-- Main Content Area: full-width canvas with overlay sidebars -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Dashboard Canvas (unified — no more grid/dashboard mode split) -->
      <DashboardCanvas
        bind:this={dashboardCanvas}
        onopenLeftSidebar={() => uiUtils.setLeftSidebar(true)}
        onopenWizard={openWizard}
      />

      <!-- Left Sidebar — overlay drawer (slides over canvas) -->
      {#if $showLeftSidebar}
        <div
          class="absolute top-0 left-0 bottom-0 z-40 w-80 max-w-[85vw] animate-slide-in-left"
          role="complementary"
          aria-label="Sensor inventory panel"
        >
          <LeftSidebar
            bind:this={leftSidebarComponent}
            onclose={() => uiUtils.setLeftSidebar(false)}
            onopenWizard={openWizard}
          />
        </div>
      {/if}

      <!-- Right Sidebar — overlay drawer (slides over canvas) -->
      {#if $showRightSidebar}
        <div
          class="absolute top-0 right-0 bottom-0 z-40 animate-slide-in-right"
          role="complementary"
          aria-label="Properties panel"
          style:width="{$inspectorStore.rightSidebarWidth}px"
        >
          <RightSidebar
            onclose={() => uiUtils.setRightSidebar(false)}
            onlocateGroup={handleLocateGroup}
          />
        </div>
      {/if}

      <!-- Floating Toolbar (pill-shaped, anchored bottom-center) -->
      <FloatingToolbar />
    </div>

    <!-- Context Menu -->
    {#if $contextMenu.show}
      <ContextMenu
        x={$contextMenu.x}
        y={$contextMenu.y}
        target={$contextMenu.target}
        onfindInSidebar={handleFindInSidebar}
        onopenWizard={openWizard}
      />
    {/if}

    {#if showWizard}
      <SensorToWidgetWizard onclose={closeWizard} />
    {/if}

    <!-- Connection Status Indicator -->
    <ConnectionStatus />
  </div>
{/if}

<style>
  @keyframes slide-in-left {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in-left {
    animation: slide-in-left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
