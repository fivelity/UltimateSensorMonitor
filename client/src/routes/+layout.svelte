<script lang="ts">
  import { apiService } from "$lib/services/api";
  import { websocketService } from "$lib/services/websocket";
  import {
    connectionStatus,
    initializeStores,
    sensorUtils,
    visualSettings,
  } from "$lib/stores";
  import type { SensorData } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import "../app.css";

  const { children }: { children: Snippet } = $props();

  onMount(() => {
    let cancelled = false;
    let unsubscribeVisualSettings: (() => void) | undefined;
    let websocketUnsubscribe: (() => void) | undefined;

    (async () => {
      // Initialize stores when the app starts
      initializeStores();

      // Fetch initial sensor sources and hardware tree
      await loadInitialSensorData();
      if (cancelled) return;

      // Start WebSocket connection (only in browser)
      if (typeof window !== "undefined") {
        try {
          websocketService.connect("ws://localhost:8100/ws");

          // Subscribe to WebSocket messages
          websocketUnsubscribe = websocketService.subscribe(
            (message: { type: string; data?: unknown }) => {
              if (message.type === "sensor_data" && message.data) {
                sensorUtils.updateSensorData(
                  message.data as Record<string, SensorData>,
                );
              }
            },
          );

          // Update connection status
          websocketService.onConnectionChange(
            (status: "connecting" | "connected" | "disconnected" | "error") => {
              connectionStatus.set(status);
            },
          );
        } catch (error) {
          logger.error("Failed to establish WebSocket connection:", error);
          connectionStatus.set("error");
        }
      }

      if (cancelled) return;

      // Apply initial visual settings to CSS variables
      unsubscribeVisualSettings = visualSettings.subscribe((settings) => {
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          root.style.setProperty(
            "--materiality",
            settings.materiality.toString(),
          );
          root.style.setProperty(
            "--information-density",
            settings.information_density.toString(),
          );
          root.style.setProperty(
            "--animation-level",
            settings.animation_level.toString(),
          );
          root.style.setProperty("--grid-size", `${settings.grid_size}px`);

          // Apply theme class
          document.body.className = document.body.className.replace(
            /theme-\w+/,
            "",
          );
          document.body.classList.add(`theme-${settings.color_scheme}`);

          // Apply font family
          root.style.setProperty("--font-family", settings.font_family);

          // Apply reduced motion preference
          if (settings.reduce_motion) {
            document.body.classList.add("reduce-motion");
          } else {
            document.body.classList.remove("reduce-motion");
          }
        }
      });
    })();

    // Cleanup function
    return () => {
      cancelled = true;
      if (unsubscribeVisualSettings) {
        unsubscribeVisualSettings();
      }

      if (websocketUnsubscribe) {
        websocketUnsubscribe();
      }

      websocketService.disconnect();
    };
  });

  async function loadInitialSensorData() {
    const sourcesResponse = await apiService.getSensors();
    logger.debug("[Layout] Sensor Sources Response:", sourcesResponse);
    if (sourcesResponse.success && sourcesResponse.data) {
      sensorUtils.updateSensorSources(sourcesResponse.data.sources);

      const lhmUpdatedSource =
        sourcesResponse.data.sources["librehardware"];
      if (lhmUpdatedSource && lhmUpdatedSource.active) {
        const treeResponse = await apiService.getHardwareTree();
        logger.debug("[Layout] Hardware Tree Response:", treeResponse);
        if (treeResponse.success && treeResponse.data) {
          sensorUtils.updateHardwareTree(treeResponse.data.hardware);
        }
      }
    }
  }
</script>

<main
  class="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)] font-[var(--font-family)]"
>
  {@render children()}
</main>

<style>
  :global(.reduce-motion *) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
</style>
