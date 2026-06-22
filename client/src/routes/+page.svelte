<script lang="ts">
  import { 
    editMode, 
    widgetArray, 
    selectedWidgets, 
    visualSettings, 
    contextMenu, 
    connectionStatus,
    availableSensors,
    storeUtils 
  } from '$lib/stores';
  import { apiService } from '$lib/services/api';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftSidebar from '$lib/components/LeftSidebar.svelte';
  import RightSidebar from '$lib/components/RightSidebar.svelte';
  import DashboardCanvas from '$lib/components/DashboardCanvas.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
  import type { WidgetConfig } from '$lib/types';

  // Suppress unused-import warning — connectionStatus is imported for type consistency with the layout
  void connectionStatus;

  let showLeftSidebar = $state(false);
  let showRightSidebar = $state(false);
  let hasCreatedInitialWidgets = $state(false);
  let leftSidebarComponent: InstanceType<typeof LeftSidebar> | null = $state(null); // Reference to left sidebar component

  $effect(() => {
    // Async initialization function
    const initializeApp = async () => {
      // Try to load real sensor data immediately
      const sensorsResult = await apiService.getSensors();
      if (sensorsResult.success && sensorsResult.data) {
        storeUtils.updateSensorSources(sensorsResult.data.sources);

        // Wait a moment for stores to update, then create initial widgets
        setTimeout(() => {
          createInitialWidgetsFromRealData();
        }, 500);
      } else {
        // If real sensors aren't available, fall back to demo data
        console.warn('Real sensor data not available, loading demo data...');
        const { demoSensorSources, demoSensorData, demoWidgets } = await import('$lib/demoData');

        storeUtils.updateSensorSources(demoSensorSources);
        storeUtils.updateSensorData(demoSensorData);

        demoWidgets.forEach(widget => {
          storeUtils.addWidget(widget);
        });
      }
    };

    // Start initialization
    initializeApp();

    // Set up keyboard shortcuts
    const handleKeydown = (event: KeyboardEvent) => {
      // Escape key - clear selection and hide context menu
      if (event.key === 'Escape') {
        storeUtils.clearSelection();
        storeUtils.hideContextMenu();
      }

      // Toggle edit mode with 'E' key
      if (event.key === 'e' || event.key === 'E') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          editMode.update(mode => mode === 'edit' ? 'view' : 'edit');
        }
      }

      // Delete selected widgets with Delete key
      if (event.key === 'Delete' && $editMode === 'edit') {
        const selection = $selectedWidgets;
        if (selection.type === 'widget' && selection.ids.length > 0) {
          selection.ids.forEach(id => storeUtils.removeWidget(id));
          storeUtils.clearSelection();
        }
      }

      // Select all with Ctrl+A
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && $editMode === 'edit') {
        event.preventDefault();
        const allWidgetIds = $widgetArray.map(w => w.id);
        if (allWidgetIds.length > 0) {
          selectedWidgets.set({ type: 'widget', ids: allWidgetIds });
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  // Watch for available sensors changes and create widgets when data becomes available
  $effect(() => {
    if ($availableSensors.length > 0 && !hasCreatedInitialWidgets) {
      createInitialWidgetsFromRealData();
    }
  });

  // Create initial widgets from real sensor data
  function createInitialWidgetsFromRealData() {
    if (hasCreatedInitialWidgets || $availableSensors.length === 0) {
      console.log('[CreateWidgets] Skipped - already created:', hasCreatedInitialWidgets, 'or no sensors:', $availableSensors.length);
      return;
    }

    console.log('[CreateWidgets] Creating initial widgets from real sensor data...');
    console.log('[CreateWidgets] Available sensors:', $availableSensors);
    hasCreatedInitialWidgets = true;

    // Create widgets for different sensor types
    const sensorsByCategory = $availableSensors.reduce((acc, sensor) => {
      if (!acc[sensor.category]) {
        acc[sensor.category] = [];
      }
      acc[sensor.category].push(sensor);
      return acc;
    }, {} as Record<string, typeof $availableSensors>);

    console.log('[CreateWidgets] Sensors by category:', sensorsByCategory);

    let currentX = 50;
    let currentY = 50;
    const widgetSpacing = 250;
    const rowHeight = 250;
    let widgetsInRow = 0;
    const maxWidgetsPerRow = 4;

    // Helper function to advance position
    const advancePosition = () => {
      currentX += widgetSpacing;
      widgetsInRow++;
      if (widgetsInRow >= maxWidgetsPerRow) {
        currentX = 50;
        currentY += rowHeight;
        widgetsInRow = 0;
      }
    };

    // Temperature sensors - create radial gauges
    if (sensorsByCategory.temperature && sensorsByCategory.temperature.length > 0) {
      console.log('[CreateWidgets] Creating temperature widgets...');
      sensorsByCategory.temperature.slice(0, 3).forEach((sensor, index) => {
        const widget: WidgetConfig = {
          id: `temp_widget_${sensor.id}`,
          sensor_id: sensor.id,
          gauge_type: 'radial',
          pos_x: currentX,
          pos_y: currentY,
          width: 200,
          height: 200,
          rotation: 0,
          z_index: 0,
          is_locked: false,
          show_label: true,
          show_unit: true,
          gauge_settings: {
            start_angle: 0,
            end_angle: 270,
            color_primary: '#ef4444',
            stroke_width: 8
          },
          style_settings: {}
        };
        console.log('[CreateWidgets] Created temperature widget:', widget.id, 'for sensor:', sensor.id);
        storeUtils.addWidget(widget);
        advancePosition();
      });
    }

    // Usage/Load sensors - create linear gauges
    if (sensorsByCategory.load && sensorsByCategory.load.length > 0) {
      console.log('[CreateWidgets] Creating load/usage widgets...');
      sensorsByCategory.load.slice(0, 3).forEach((sensor, index) => {
        const widget: WidgetConfig = {
          id: `load_widget_${sensor.id}`,
          sensor_id: sensor.id,
          gauge_type: 'linear',
          pos_x: currentX,
          pos_y: currentY,
          width: 250,
          height: 100,
          rotation: 0,
          z_index: 0,
          is_locked: false,
          show_label: true,
          show_unit: true,
          gauge_settings: {
            orientation: 'horizontal',
            color_primary: '#10b981'
          },
          style_settings: {}
        };
        console.log('[CreateWidgets] Created load widget:', widget.id, 'for sensor:', sensor.id);
        storeUtils.addWidget(widget);
        advancePosition();
      });
    }

    // Power sensors - create text displays
    if (sensorsByCategory.power && sensorsByCategory.power.length > 0) {
      console.log('[CreateWidgets] Creating power widgets...');
      sensorsByCategory.power.slice(0, 2).forEach((sensor, index) => {
        const widget: WidgetConfig = {
          id: `power_widget_${sensor.id}`,
          sensor_id: sensor.id,
          gauge_type: 'text',
          pos_x: currentX,
          pos_y: currentY,
          width: 180,
          height: 120,
          rotation: 0,
          z_index: 0,
          is_locked: false,
          show_label: true,
          show_unit: true,
          gauge_settings: {},
          style_settings: {}
        };
        console.log('[CreateWidgets] Created power widget:', widget.id, 'for sensor:', sensor.id);
        storeUtils.addWidget(widget);
        advancePosition();
      });
    }

    // Fan sensors - create radial gauges
    if (sensorsByCategory.fan && sensorsByCategory.fan.length > 0) {
      console.log('[CreateWidgets] Creating fan widgets...');
      sensorsByCategory.fan.slice(0, 2).forEach((sensor, index) => {
        const widget: WidgetConfig = {
          id: `fan_widget_${sensor.id}`,
          sensor_id: sensor.id,
          gauge_type: 'radial',
          pos_x: currentX,
          pos_y: currentY,
          width: 180,
          height: 180,
          rotation: 0,
          z_index: 0,
          is_locked: false,
          show_label: true,
          show_unit: true,
          gauge_settings: {
            start_angle: 45,
            end_angle: 315,
            color_primary: '#f59e0b',
            stroke_width: 6
          },
          style_settings: {}
        };
        console.log('[CreateWidgets] Created fan widget:', widget.id, 'for sensor:', sensor.id);
        storeUtils.addWidget(widget);
        advancePosition();
      });
    }

    console.log(`[CreateWidgets] Created ${$widgetArray.length} initial widgets from real sensor data`);
  }

  // Handle sidebar toggles
  function toggleLeftSidebar() {
    showLeftSidebar = !showLeftSidebar;
  }

  function toggleRightSidebar() {
    showRightSidebar = !showRightSidebar;
  }

  // Handle clicking outside context menu
  function handleDocumentClick(event: MouseEvent) {
    if ($contextMenu.show) {
      const target = event.target as Element;
      if (!target.closest('.context-menu')) {
        storeUtils.hideContextMenu();
      }
    }
  }

  // Handle find in sidebar from context menu
  function handleFindInSidebar(sensorId: string) {
    console.log('[FindInSidebar] Looking for sensor:', sensorId);

    // Ensure left sidebar is open
    if (!showLeftSidebar) {
      showLeftSidebar = true;
    }

    // Call the sidebar function after a short delay to ensure it's rendered
    setTimeout(() => {
      if (leftSidebarComponent?.findSensorInSidebar) {
        leftSidebarComponent.findSensorInSidebar(sensorId);
      }
    }, 100);
  }
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="flex flex-col h-screen overflow-hidden bg-[var(--theme-background)]">
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
      <div class="w-80 border-r border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300">
        <LeftSidebar bind:this={leftSidebarComponent} onclose={() => { showLeftSidebar = false; }} />
      </div>
    {/if}

    <!-- Dashboard Canvas -->
    <div class="flex-1 relative overflow-hidden">
      <DashboardCanvas />

      <!-- Grid overlay when in edit mode and grid is enabled -->
      {#if $editMode === 'edit' && $visualSettings.show_grid}
        <div class="absolute inset-0 pointer-events-none micro-grid opacity-30"></div>
      {/if}
    </div>

    <!-- Right Sidebar -->
    {#if showRightSidebar}
      <div class="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300">
        <RightSidebar onclose={() => { showRightSidebar = false; }} />
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

<style>
  /* Custom scrollbar for sidebars */
  :global(.sidebar-content) {
    scrollbar-width: thin;
    scrollbar-color: var(--theme-border) transparent;
  }

  :global(.sidebar-content::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.sidebar-content::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.sidebar-content::-webkit-scrollbar-thumb) {
    background: var(--theme-border);
    border-radius: 3px;
  }

  :global(.sidebar-content::-webkit-scrollbar-thumb:hover) {
    background: var(--theme-text-muted);
  }
</style>
