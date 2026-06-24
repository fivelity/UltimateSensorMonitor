<script lang="ts">
  import {
    dashboardLayout,
    editMode,
    selectedWidgets,
    visualSettings,
    widgetGroups,
    widgets,
  } from "$lib/stores";
  import { widgetUtils } from "$lib/stores/data/widgets";
  import { historyStore } from "$lib/stores/history";
  import { themePresets, themeUtils } from "$lib/stores/themes";
  import type { DashboardPreset } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import {
    Download,
    Edit3,
    Eye,
    FolderOpen,
    Grid3X3,
    Palette,
    RotateCcw,
    RotateCw,
    Save,
    Settings,
    Upload,
  } from "@lucide/svelte";

  const {
    showLeftSidebar,
    showRightSidebar,
    workspaceMode = "dashboard",
    ontoggleLeftSidebar,
    ontoggleRightSidebar,
    ontoggleWorkspace,
  }: {
    showLeftSidebar: boolean;
    showRightSidebar: boolean;
    workspaceMode?: "dashboard" | "grid";
    ontoggleLeftSidebar?: () => void;
    ontoggleRightSidebar?: () => void;
    ontoggleWorkspace?: () => void;
  } = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let showThemeMenu = $state(false);
  let themeMenuElement: HTMLDivElement | undefined = $state();

  // History state
  const canUndo = $derived($historyStore.currentIndex >= 0);
  const canRedo = $derived(
    $historyStore.currentIndex < $historyStore.commands.length - 1,
  );

  const themeOptions = $derived(
    Object.values(themePresets).map((preset) => ({
      id: preset.id,
      name: preset.name,
      schemeId: preset.color_scheme.id,
    })),
  );

  const activeTheme = $derived(
    themeUtils.getThemePresetForColorScheme($visualSettings.color_scheme)?.id ??
      "professional_default",
  );

  function toggleEditMode() {
    editMode.update((mode) => (mode === "edit" ? "view" : "edit"));
  }

  function toggleLeftSidebar() {
    ontoggleLeftSidebar?.();
  }

  function toggleRightSidebar() {
    ontoggleRightSidebar?.();
  }

  function toggleWorkspace() {
    ontoggleWorkspace?.();
  }

  function applyThemePreset(presetId: string) {
    const preset = themeUtils.getThemePreset(presetId);
    if (!preset) return;

    visualSettings.update((settings) => ({
      ...settings,
      color_scheme: preset.color_scheme.id,
      materiality: preset.visual_settings.materiality ?? settings.materiality,
      information_density:
        preset.visual_settings.information_density ??
        settings.information_density,
      animation_level:
        preset.visual_settings.animation_level ?? settings.animation_level,
      enable_blur_effects:
        preset.visual_settings.enable_blur_effects ??
        settings.enable_blur_effects,
      enable_animations:
        preset.visual_settings.enable_animations ?? settings.enable_animations,
    }));

    showThemeMenu = false;
  }

  function handleThemeKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      showThemeMenu = false;
    }
  }

  function handleThemeClickOutside(event: MouseEvent) {
    if (
      showThemeMenu &&
      themeMenuElement &&
      !themeMenuElement.contains(event.target as Node)
    ) {
      showThemeMenu = false;
    }
  }

  // Enhanced preset management
  function exportPreset() {
    const preset: DashboardPreset = {
      id: crypto.randomUUID(),
      name: `Dashboard_${new Date().toISOString().split("T")[0]}`,
      description: "Exported dashboard preset",
      widgets: Object.values($widgets),
      widget_groups: Object.values($widgetGroups),
      layout: $dashboardLayout,
      visual_settings: $visualSettings,
      created_at: new Date().toISOString(),
      version: "1.0",
    };

    const dataStr = JSON.stringify(preset, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${preset.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    fileInput?.click();
  }

  function handleFileImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset = JSON.parse(
          e.target?.result as string,
        ) as DashboardPreset;
        importPreset(preset);
      } catch (error) {
        logger.error("Failed to import preset:", error);
        alert("Failed to import preset. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  function importPreset(preset: DashboardPreset) {
    // Clear current widgets, groups, and history to avoid undoing across resets
    widgetUtils.clearAllWidgets();
    widgetUtils.clearAllGroups();
    historyStore.clear();

    // Import widgets
    preset.widgets.forEach((widget) => {
      widgetUtils.addWidget(widget);
    });

    // Import groups
    preset.widget_groups.forEach((group) => {
      widgetUtils.addGroup(group);
    });

    // Update visual settings
    visualSettings.set(preset.visual_settings);

    // Update layout
    dashboardLayout.set(preset.layout);

    logger.debug("Successfully imported preset:", preset.name);
  }

  function savePresetToLocal() {
    const preset: DashboardPreset = {
      id: crypto.randomUUID(),
      name: `Local_${Date.now()}`,
      description: "Local saved preset",
      widgets: Object.values($widgets),
      widget_groups: Object.values($widgetGroups),
      layout: $dashboardLayout,
      visual_settings: $visualSettings,
      created_at: new Date().toISOString(),
      version: "1.0",
    };

    const savedPresets = JSON.parse(
      localStorage.getItem("ultimon_presets") || "[]",
    ) as DashboardPreset[];
    savedPresets.push(preset);
    localStorage.setItem("ultimon_presets", JSON.stringify(savedPresets));

    logger.debug("Preset saved locally");
  }

  function loadPresetFromLocal() {
    const savedPresets = JSON.parse(
      localStorage.getItem("ultimon_presets") || "[]",
    ) as DashboardPreset[];
    if (savedPresets.length > 0) {
      // For now, load the most recent preset
      const latestPreset = savedPresets[savedPresets.length - 1];
      importPreset(latestPreset);
      logger.debug("Loaded latest local preset");
    } else {
      alert("No local presets found");
    }
  }
</script>

<svelte:window onclick={handleThemeClickOutside} />

<div
  class="flex items-center justify-between px-4 py-2 bg-[var(--theme-surface)] border-b border-[var(--theme-border)]"
>
  <!-- Left section -->
  <div class="flex items-center space-x-2">
    <!-- Logo/Title -->
    <div class="text-lg font-bold text-[var(--theme-primary)]">Ultimon</div>

    <div class="h-6 border-l border-[var(--theme-border)]"></div>

    <!-- Edit/View Mode Toggle -->
    <div class="flex items-center space-x-2">
      <button
        onclick={toggleEditMode}
        class="flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        class:bg-[var(--theme-primary)]={$editMode === "edit"}
        class:text-[var(--theme-background)]={$editMode === "edit"}
        class:shadow-sm={$editMode === "edit"}
        class:bg-[var(--theme-background)]={$editMode === "view"}
        class:text-[var(--theme-text)]={$editMode === "view"}
        class:hover:bg-[var(--theme-primary)]={$editMode === "edit"}
        class:hover:bg-[var(--theme-border)]={$editMode === "view"}
        title={$editMode === "edit"
          ? "Switch to View Mode"
          : "Switch to Edit Mode"}
      >
        {#if $editMode === "edit"}
          <Edit3 size={16} />
          <span class="text-sm font-medium">Editing</span>
          <span class="text-xs opacity-75">(Click to View)</span>
        {:else}
          <Eye size={16} />
          <span class="text-sm font-medium">Viewing</span>
          <span class="text-xs opacity-75">(Click to Edit)</span>
        {/if}
      </button>
    </div>

    <!-- Preset Management -->
    <div class="flex items-center space-x-1">
      <button
        onclick={savePresetToLocal}
        class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Save Preset Locally"
        aria-label="Save Preset Locally"
      >
        <Save size={16} />
      </button>

      <button
        onclick={loadPresetFromLocal}
        class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Load Local Preset"
        aria-label="Load Local Preset"
      >
        <FolderOpen size={16} />
      </button>

      <button
        onclick={exportPreset}
        class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Export Preset"
        aria-label="Export Preset"
      >
        <Download size={16} />
      </button>

      <button
        onclick={triggerImport}
        class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Import Preset"
        aria-label="Import Preset"
      >
        <Upload size={16} />
      </button>
    </div>

    <!-- Undo/Redo Controls -->
    {#if $editMode === "edit"}
      <div class="h-6 border-l border-[var(--theme-border)]"></div>

      <div class="flex items-center space-x-1">
        <button
          onclick={() => historyStore.undo()}
          disabled={!canUndo}
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onclick={() => historyStore.redo()}
          disabled={!canRedo}
          class="p-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
          title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
          aria-label="Redo"
        >
          <RotateCw size={16} />
        </button>
      </div>
    {/if}
  </div>

  <!-- Center section -->
  <div class="flex items-center space-x-4">
    {#if $editMode === "edit" && $selectedWidgets.ids.length > 0}
      <div class="text-sm text-[var(--theme-text-muted)]">
        {$selectedWidgets.ids.length} widget{$selectedWidgets.ids.length === 1
          ? ""
          : "s"} selected
      </div>
    {/if}
  </div>

  <!-- Right section -->
  <div class="flex items-center space-x-2">
    <!-- Theme selector -->
    <div class="relative" bind:this={themeMenuElement}>
      <button
        onclick={() => (showThemeMenu = !showThemeMenu)}
        class="flex items-center gap-2 px-2 py-2 rounded-md text-[var(--theme-text-muted)] hover:bg-[var(--theme-background)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Change Theme"
        aria-label="Change Theme"
        aria-expanded={showThemeMenu}
        aria-haspopup="listbox"
      >
        <Palette size={16} />
        <span class="text-sm font-medium hidden sm:inline">
          {themeUtils.getThemePreset(activeTheme).name}
        </span>
      </button>

      {#if showThemeMenu}
        <div
          class="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg overflow-hidden z-50"
          role="listbox"
          tabindex="0"
          aria-label="Theme presets"
          onkeydown={handleThemeKeydown}
        >
          {#each themeOptions as option}
            <button
              class="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
              class:text-[var(--theme-text)]={activeTheme === option.id}
              class:bg-[var(--theme-background)]={activeTheme !== option.id}
              class:bg-[var(--theme-primary)]={activeTheme === option.id}
              class:text-[var(--theme-background)]={activeTheme === option.id}
              class:hover:bg-[var(--theme-border)]={activeTheme !== option.id}
              onclick={() => applyThemePreset(option.id)}
              role="option"
              aria-selected={activeTheme === option.id}
            >
              <span
                class="w-3 h-3 rounded-full border border-[var(--theme-border)]"
                style="background: {themeUtils.getThemePreset(option.id)
                  .color_scheme.colors.primary};"
              ></span>
              <span class="flex-1">{option.name}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Workspace mode toggle -->
    <button
      onclick={toggleWorkspace}
      class="px-2 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
      class:bg-[var(--theme-primary)]={workspaceMode === "grid"}
      class:text-[var(--theme-background)]={workspaceMode === "grid"}
      class:text-[var(--theme-text-muted)]={workspaceMode !== "grid"}
      class:hover:bg-[var(--theme-background)]={workspaceMode !== "grid"}
      class:hover:text-[var(--theme-text)]={workspaceMode !== "grid"}
      title={workspaceMode === "grid"
        ? "Switch to Dashboard"
        : "Switch to Grid"}
      aria-label={workspaceMode === "grid"
        ? "Switch to Dashboard"
        : "Switch to Grid"}
    >
      {workspaceMode === "grid" ? "Dashboard" : "Grid"}
    </button>

    <!-- Grid toggle -->
    {#if $editMode === "edit"}
      <button
        onclick={() =>
          visualSettings.update((vs) => ({ ...vs, show_grid: !vs.show_grid }))}
        class="p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        class:bg-[var(--theme-primary)]={$visualSettings.show_grid}
        class:text-[var(--theme-background)]={$visualSettings.show_grid}
        class:text-[var(--theme-text-muted)]={!$visualSettings.show_grid}
        class:hover:bg-[var(--theme-background)]={!$visualSettings.show_grid}
        class:hover:text-[var(--theme-text)]={!$visualSettings.show_grid}
        title="Toggle Grid"
        aria-label="Toggle Grid"
      >
        <Grid3X3 size={16} />
      </button>
    {/if}

    <!-- Sidebar toggles -->
    <button
      onclick={toggleLeftSidebar}
      class="px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
      class:bg-[var(--theme-primary)]={showLeftSidebar}
      class:text-[var(--theme-background)]={showLeftSidebar}
      class:text-[var(--theme-text-muted)]={!showLeftSidebar}
      class:hover:bg-[var(--theme-background)]={!showLeftSidebar}
      class:hover:text-[var(--theme-text)]={!showLeftSidebar}
      title="Toggle Sensor Panel"
    >
      Sensors
    </button>

    <button
      onclick={toggleRightSidebar}
      class="p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
      class:bg-[var(--theme-primary)]={showRightSidebar}
      class:text-[var(--theme-background)]={showRightSidebar}
      class:text-[var(--theme-text-muted)]={!showRightSidebar}
      class:hover:bg-[var(--theme-background)]={!showRightSidebar}
      class:hover:text-[var(--theme-text)]={!showRightSidebar}
      title="Toggle Inspector Panel"
      aria-label="Toggle Inspector Panel"
    >
      <Settings size={16} />
    </button>
  </div>
</div>

<!-- Hidden file input for import -->
<input
  bind:this={fileInput}
  type="file"
  accept=".json"
  onchange={handleFileImport}
  class="hidden"
/>

<style>
  /* TopBar uses theme tokens only */
</style>
