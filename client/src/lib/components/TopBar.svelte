<script lang="ts">
  /**
   * TopBar — slim glassmorphic top bar.
   *
   * Redesigned to focus on app identity and preset management. The legacy
   * edit/view mode toggle, sidebar toggles, grid toggle, and workspace mode
   * toggle have moved to the FloatingToolbar. Undo/redo also live in the
   * FloatingToolbar but remain accessible here as compact icon buttons.
   */

  import {
    connectionStatus,
    dashboardLayout,
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
    Activity,
    Download,
    FolderOpen,
    Palette,
    RotateCcw,
    RotateCw,
    Save,
    Upload,
  } from "@lucide/svelte";

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

  const connectionDotClass = $derived(
    $connectionStatus === "connected"
      ? "bg-[var(--theme-success)] shadow-[0_0_8px_rgba(var(--theme-success-rgb),0.7)]"
      : $connectionStatus === "connecting"
        ? "bg-[var(--theme-warning)] animate-pulse"
        : $connectionStatus === "error"
          ? "bg-[var(--theme-danger)] shadow-[0_0_8px_rgba(var(--theme-danger-rgb),0.7)]"
          : "bg-[var(--theme-text-muted)]",
  );

  const connectionLabel = $derived(
    $connectionStatus === "connected"
      ? "Live"
      : $connectionStatus === "connecting"
        ? "Connecting"
        : $connectionStatus === "error"
          ? "Error"
          : "Offline",
  );

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
    widgetUtils.clearAllWidgets();
    widgetUtils.clearAllGroups();
    historyStore.clear();

    preset.widgets.forEach((widget) => {
      widgetUtils.addWidget(widget);
    });

    preset.widget_groups.forEach((group) => {
      widgetUtils.addGroup(group);
    });

    visualSettings.set(preset.visual_settings);
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
      const latestPreset = savedPresets[savedPresets.length - 1];
      importPreset(latestPreset);
      logger.debug("Loaded latest local preset");
    } else {
      alert("No local presets found");
    }
  }
</script>

<svelte:window onclick={handleThemeClickOutside} />

<header
  class="glass-panel flex items-center justify-between gap-4 px-4 py-2 border-b border-[var(--glass-border)]"
>
  <!-- Left: brand + connection -->
  <div class="flex items-center gap-3 min-w-0">
    <div class="flex items-center gap-2 shrink-0">
      <div
        class="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]"
        style="box-shadow: 0 0 12px rgba(var(--theme-primary-rgb), 0.35);"
        aria-hidden="true"
      >
        <Activity size={16} />
      </div>
      <div class="flex flex-col leading-tight">
        <span class="text-sm font-semibold text-[var(--theme-text)]">
          Ultimon
        </span>
        <span class="text-[10px] text-[var(--theme-text-muted)] -mt-0.5">
          Sensor Monitor
        </span>
      </div>
    </div>

    <div class="h-6 w-px bg-white/10 shrink-0"></div>

    <!-- Connection status -->
    <div
      class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5"
      title="Connection status: {connectionLabel}"
    >
      <span class="w-2 h-2 rounded-full {connectionDotClass}"></span>
      <span class="text-[11px] font-medium text-[var(--theme-text-muted)]">
        {connectionLabel}
      </span>
    </div>
  </div>

  <!-- Center: selection indicator -->
  <div class="flex items-center gap-2 min-w-0">
    {#if $selectedWidgets.ids.length > 0}
      <span class="text-xs text-[var(--theme-text-muted)] truncate">
        {$selectedWidgets.ids.length} widget{$selectedWidgets.ids.length === 1
          ? ""
          : "s"} selected
      </span>
    {/if}
  </div>

  <!-- Right: presets + theme + undo/redo -->
  <div class="flex items-center gap-1 shrink-0">
    <!-- Preset management -->
    <div class="flex items-center gap-0.5">
      <button
        onclick={savePresetToLocal}
        class="topbar-icon-button"
        title="Save Preset Locally"
        aria-label="Save Preset Locally"
      >
        <Save size={15} />
      </button>
      <button
        onclick={loadPresetFromLocal}
        class="topbar-icon-button"
        title="Load Local Preset"
        aria-label="Load Local Preset"
      >
        <FolderOpen size={15} />
      </button>
      <button
        onclick={exportPreset}
        class="topbar-icon-button"
        title="Export Preset"
        aria-label="Export Preset"
      >
        <Download size={15} />
      </button>
      <button
        onclick={triggerImport}
        class="topbar-icon-button"
        title="Import Preset"
        aria-label="Import Preset"
      >
        <Upload size={15} />
      </button>
    </div>

    <div class="h-6 w-px bg-white/10 mx-1"></div>

    <!-- Undo / Redo -->
    <button
      onclick={() => historyStore.undo()}
      disabled={!canUndo}
      class="topbar-icon-button disabled:opacity-30 disabled:cursor-not-allowed"
      title="Undo (Ctrl+Z)"
      aria-label="Undo"
    >
      <RotateCcw size={15} />
    </button>
    <button
      onclick={() => historyStore.redo()}
      disabled={!canRedo}
      class="topbar-icon-button disabled:opacity-30 disabled:cursor-not-allowed"
      title="Redo (Ctrl+Shift+Z)"
      aria-label="Redo"
    >
      <RotateCw size={15} />
    </button>

    <div class="h-6 w-px bg-white/10 mx-1"></div>

    <!-- Theme selector -->
    <div class="relative" bind:this={themeMenuElement}>
      <button
        onclick={() => (showThemeMenu = !showThemeMenu)}
        class="topbar-icon-button flex items-center gap-1.5"
        title="Change Theme"
        aria-label="Change Theme"
        aria-expanded={showThemeMenu}
        aria-haspopup="listbox"
      >
        <Palette size={15} />
        <span class="text-xs font-medium hidden sm:inline">
          {themeUtils.getThemePreset(activeTheme).name}
        </span>
      </button>

      {#if showThemeMenu}
        <div
          class="glass-panel-elevated absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden z-50 py-1"
          role="listbox"
          tabindex="0"
          aria-label="Theme presets"
          onkeydown={handleThemeKeydown}
        >
          {#each themeOptions as option}
            <button
              class="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2.5"
              class:text-[var(--theme-text)]={activeTheme !== option.id}
              class:bg-[var(--theme-primary)]={activeTheme === option.id}
              class:text-[var(--theme-background)]={activeTheme === option.id}
              class:hover-glass={activeTheme !== option.id}
              onclick={() => applyThemePreset(option.id)}
              role="option"
              aria-selected={activeTheme === option.id}
            >
              <span
                class="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                style="background: {themeUtils.getThemePreset(option.id)
                  .color_scheme.colors.primary};"
              ></span>
              <span class="flex-1">{option.name}</span>
              {#if activeTheme === option.id}
                <span class="text-[10px] opacity-80">●</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Hidden file input for import -->
<input
  bind:this={fileInput}
  type="file"
  accept=".json"
  onchange={handleFileImport}
  class="hidden"
/>

<style>
  .topbar-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: var(--theme-text-muted);
    transition: all 0.18s ease;
  }

  .topbar-icon-button:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--theme-text);
  }

  .topbar-icon-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--theme-primary);
  }

  .hover-glass:hover {
    background: rgba(255, 255, 255, 0.05);
  }
</style>
