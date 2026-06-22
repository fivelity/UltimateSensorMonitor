<script lang="ts">
  import { onMount } from 'svelte';
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
  import { configService, type AppConfig } from '$lib/services/configService';
  import { apiService } from '$lib/services/api';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftSidebar from '$lib/components/LeftSidebar.svelte';
  import RightSidebar from '$lib/components/RightSidebar.svelte';
  import DashboardCanvas from '$lib/components/DashboardCanvas.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
  import type { WidgetConfig, GaugeType } from '$lib/types';

  let showLeftSidebar = false;
  let showRightSidebar = false;
  let hasInitialized = false;
  let leftSidebarComponent: any;
  let config: AppConfig;
  let initializationError: string | null = null;

  onMount(async () => {
    try {
      // Load configuration first
      config = await configService.loadConfig();
      console.log('[App] Configuration loaded:', config);
      
      // Set UI defaults from config
      showLeftSidebar = config.ui.autoOpenLeftSidebar;
      showRightSidebar = config.ui.autoOpenRightSidebar;
      editMode.set(config.ui.defaultEditMode);
      
      // Initialize visual settings from config
      storeUtils.updateVisualSettings({
        grid_size: config.canvas.defaultGridSize,
        snap_to_grid: config.canvas.defaultSnapToGrid,
        show_grid: config.canvas.defaultShowGrid
      });
      
      // Start application initialization
      await initializeApplication();
      
    } catch (error) {
      console.error('[App] Initialization failed:', error);
      initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
    }

    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
  });

  async function initializeApplication() {
    console.log('[App] Starting application initialization...');
    
    // Check if demo data should be used (explicit config option)
    if (config.data.useDemoData) {
      console.log('[App] Demo mode enabled - loading demo data');
      await loadDemoData();
      hasInitialized = true;
      return;
    }
    
    // Attempt to load real sensor data
    console.log('[App] Attempting to load real sensor data...');
    try {
      const sensorsResult = await apiService.getSensors();
      
      if (sensorsResult.success && sensorsResult.data?.sources) {
        console.log('[App] Real sensor data loaded successfully');
        storeUtils.updateSensorSources(sensorsResult.data.sources);
        
        // Wait for reactive stores to update, then create widgets if configured
        if (config.data.autoCreateWidgets) {
          setTimeout(() => {
            createInitialWidgetsFromSensors();
          }, 100);
        }
      } else {
        console.warn('[App] Failed to load sensor data:', sensorsResult.error);
        // Do NOT fallback to demo data - just show empty state
        showEmptyState();
      }
    } catch (error) {
      console.error('[App] Error loading sensor data:', error);
      // Do NOT fallback to demo data - just show empty state
      showEmptyState();
    }
    
    hasInitialized = true;
  }

  async function loadDemoData() {
    console.log('[App] Loading demo data...');
    const { demoSensorSources, demoSensorData, demoWidgets } = await import('$lib/demoData');
    
    storeUtils.updateSensorSources(demoSensorSources);
    storeUtils.updateSensorData(demoSensorData);
    
    // Load demo widgets
    demoWidgets.forEach(widget => {
      storeUtils.addWidget(widget);
    });
    
    console.log(`[App] Demo data loaded: ${demoWidgets.length} widgets`);
  }

  function showEmptyState() {
    console.log('[App] Showing empty state - no sensor data available');
    // Clear any existing data
    storeUtils.updateSensorSources({});
    storeUtils.updateSensorData({});
    storeUtils.clearAllWidgets();
  }

  function createInitialWidgetsFromSensors() {
    const sensors = $availableSensors;
    
    if (!sensors || sensors.length === 0) {
      console.log('[App] No sensors available for widget creation');
      return;
    }

    console.log(`[App] Creating initial widgets from ${sensors.length} available sensors`);
    
    // Group sensors by category
    const sensorsByCategory = sensors.reduce((acc, sensor) => {
      if (!acc[sensor.category]) {
        acc[sensor.category] = [];
      }
      acc[sensor.category].push(sensor);
      return acc;
    }, {} as Record<string, typeof sensors>);

    // Widget creation configuration from config file
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

    // Create widgets for each category (limited by config)
    Object.entries(sensorsByCategory).forEach(([category, categorySensors]) => {
      const maxWidgets = config.data.maxWidgetsPerCategory;
      const sensorsToUse = categorySensors.slice(0, maxWidgets);
      
      sensorsToUse.forEach((sensor, index) => {
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
          style_settings: {}
        };
        
        console.log(`[App] Created ${category} widget:`, widget.id);
        storeUtils.addWidget(widget);
        advancePosition();
      });
    });

    console.log(`[App] Created ${$widgetArray.length} initial widgets`);
  }

  function getDefaultGaugeType(category: string): GaugeType {
    switch (category.toLowerCase()) {
      case 'temperature':
        return 'radial';
      case 'usage':
      case 'load':
        return 'linear';
      case 'power':
        return 'text';
      case 'fan':
        return 'radial';
      default:
        return 'text';
    }
  }

  function getDefaultGaugeSettings(category: string): any {
    switch (category.toLowerCase()) {
      case 'temperature':
        return {
          start_angle: 0,
          end_angle: 270,
          color_primary: '#ef4444',
          stroke_width: 8
        };
      case 'usage':
      case 'load':
        return {
          orientation: 'horizontal',
          color_primary: '#10b981'
        };
      case 'fan':
        return {
          start_angle: 45,
          end_angle: 315,
          color_primary: '#f59e0b',
          stroke_width: 6
        };
      default:
        return {};
    }
  }

  function setupKeyboardShortcuts() {
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
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
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
  function handleFindInSidebar(event: CustomEvent) {
    const { sensorId } = event.detail;
    console.log('[App] Looking for sensor in sidebar:', sensorId);
    
    // Ensure left sidebar is open
    if (!showLeftSidebar) {
      showLeftSidebar = true;
    }
    
    // Call the sidebar function after a short delay
    setTimeout(() => {
      if (leftSidebarComponent?.findSensorInSidebar) {
        leftSidebarComponent.findSensorInSidebar(sensorId);
      }
    }, 100);
  }
</script>

<svelte:document on:click={handleDocumentClick} />

{#if initializationError}
  <div class="flex items-center justify-center h-screen bg-red-50">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-red-800 mb-4">Initialization Error</h1>
      <p class="text-red-600 mb-4">{initializationError}</p>
      <button 
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        on:click={() => window.location.reload()}
      >
        Reload Application
      </button>
    </div>
  </div>
{:else if !hasInitialized}
  <div class="flex items-center justify-center h-screen bg-[var(--theme-background)]">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)] mx-auto mb-4"></div>
      <p class="text-[var(--theme-text-muted)]">Loading Ultimate Sensor Monitor...</p>
    </div>
  </div>
{:else}
  <div class="flex flex-col h-screen overflow-hidden bg-[var(--theme-background)]">
    <!-- Top Bar -->
    <TopBar 
      on:toggle-left-sidebar={toggleLeftSidebar}
      on:toggle-right-sidebar={toggleRightSidebar}
      {showLeftSidebar}
      {showRightSidebar}
    />

    <!-- Main Content Area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      {#if showLeftSidebar}
        <div class="w-80 border-r border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300">
          <LeftSidebar bind:this={leftSidebarComponent} on:close={() => showLeftSidebar = false} />
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
                {#if config.data.useDemoData}
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
                    on:click={toggleLeftSidebar}
                  >
                    Open Sensor Panel
                  </button>
                {/if}
                <button
                  class="px-4 py-2 border border-[var(--theme-border)] rounded hover:bg-[var(--theme-surface)]"
                  on:click={() => editMode.set('edit')}
                >
                  Enter Edit Mode
                </button>
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Grid overlay when in edit mode and grid is enabled -->
        {#if $editMode === 'edit' && $visualSettings.show_grid}
          <div class="absolute inset-0 pointer-events-none micro-grid opacity-30"></div>
        {/if}
      </div>

      <!-- Right Sidebar -->
      {#if showRightSidebar}
        <div class="w-80 border-l border-[var(--theme-border)] bg-[var(--theme-surface)] transition-all duration-300">
          <RightSidebar on:close={() => showRightSidebar = false} />
        </div>
      {/if}
    </div>

    <!-- Context Menu -->
    {#if $contextMenu.show}
      <ContextMenu 
        x={$contextMenu.x} 
        y={$contextMenu.y} 
        target={$contextMenu.target}
        on:find-in-sidebar={handleFindInSidebar}
      />
    {/if}

    <!-- Connection Status Indicator -->
    <ConnectionStatus />
  </div>
{/if} 
