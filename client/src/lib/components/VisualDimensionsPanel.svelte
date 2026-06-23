<script lang="ts">
  import { visualSettings, visualUtils } from "$lib/stores";
  import { colorSchemes, themePresets, themeUtils } from "$lib/stores/themes";
  import type { VisualSettings } from "$lib/types";

  const fontFamilies = [
    { value: "Inter", label: "Inter (Default)" },
    { value: "JetBrains Mono", label: "JetBrains Mono (Monospace)" },
    { value: "Roboto", label: "Roboto" },
    { value: "SF Pro Display", label: "SF Pro Display" },
    { value: "Segoe UI", label: "Segoe UI" },
  ];

  function updateSettings(updates: Partial<VisualSettings>) {
    visualUtils.updateSettings(updates);
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
  }

  function resetToDefaults() {
    visualSettings.set({
      materiality: 0.5,
      information_density: 0.5,
      animation_level: 0.5,
      color_scheme: "professional",
      custom_colors: {},
      font_family: "Inter",
      font_scale: 1.0,
      enable_blur_effects: false,
      enable_animations: true,
      reduce_motion: false,
      grid_size: 5,
      snap_to_grid: true,
      show_grid: false,
    });
  }

  const activePreset = $derived(
    themeUtils.getThemePresetForColorScheme($visualSettings.color_scheme),
  );

  const schemePreview = $derived(
    colorSchemes[$visualSettings.color_scheme] ?? colorSchemes.professional,
  );
</script>

<div class="p-4 space-y-6">
  <!-- Theme Presets -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Theme Presets
    </h3>

    <div class="grid grid-cols-2 gap-2">
      {#each Object.values(themePresets) as preset}
        <button
          class="px-3 py-2 rounded-md border text-sm transition-colors text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          class:bg-[var(--theme-surface)]={activePreset?.id !== preset.id}
          class:bg-[var(--theme-primary)]={activePreset?.id === preset.id}
          class:text-[var(--theme-background)]={activePreset?.id === preset.id}
          class:text-[var(--theme-text)]={activePreset?.id !== preset.id}
          class:border-[var(--theme-border)]={activePreset?.id !== preset.id}
          class:border-[var(--theme-primary)]={activePreset?.id === preset.id}
          class:hover:bg-[var(--theme-background)]={activePreset?.id !==
            preset.id}
          onclick={() => applyThemePreset(preset.id)}
          title={preset.description}
        >
          <span
            class="w-3 h-3 rounded-full border border-[var(--theme-border)]"
            style="background: {preset.color_scheme.colors.primary};"
          ></span>
          <span class="truncate">{preset.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Color Scheme -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Color Scheme
    </h3>

    <div>
      <label
        for="vd-theme-preset"
        class="block text-sm font-medium text-[var(--theme-text)] mb-2"
        >Color Scheme</label
      >
      <div class="flex items-center gap-2">
        <select
          id="vd-theme-preset"
          class="flex-1 px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
          value={$visualSettings.color_scheme}
          onchange={(e) =>
            updateSettings({ color_scheme: e.currentTarget.value })}
        >
          {#each Object.values(colorSchemes) as scheme}
            <option value={scheme.id}>{scheme.name}</option>
          {/each}
        </select>
        <span
          class="w-8 h-8 rounded-md border border-[var(--theme-border)] shrink-0"
          style="background: linear-gradient(135deg, {schemePreview.colors
            .primary} 50%, {schemePreview.colors.background} 50%);"
          aria-hidden="true"
        ></span>
      </div>
      <p class="text-xs text-[var(--theme-text-muted)] mt-1">
        {schemePreview.name}
      </p>
    </div>
  </div>

  <!-- Visual Dimensions -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Visual Dimensions
    </h3>

    <!-- Materiality -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="vd-materiality" class="text-sm text-[var(--theme-text)]"
          >Materiality</label
        >
        <span class="text-xs text-[var(--theme-text-muted)]"
          >{Math.round($visualSettings.materiality * 100)}%</span
        >
      </div>
      <input
        id="vd-materiality"
        type="range"
        min="0"
        max="1"
        step="0.1"
        class="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer slider"
        value={$visualSettings.materiality}
        oninput={(e) =>
          updateSettings({ materiality: parseFloat(e.currentTarget.value) })}
      />
      <div
        class="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1"
      >
        <span>Flat</span>
        <span>Glassmorphic</span>
      </div>
    </div>

    <!-- Information Density -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label
          for="vd-information-density"
          class="text-sm text-[var(--theme-text)]">Information Density</label
        >
        <span class="text-xs text-[var(--theme-text-muted)]"
          >{Math.round($visualSettings.information_density * 100)}%</span
        >
      </div>
      <input
        id="vd-information-density"
        type="range"
        min="0"
        max="1"
        step="0.1"
        class="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer slider"
        value={$visualSettings.information_density}
        oninput={(e) =>
          updateSettings({
            information_density: parseFloat(e.currentTarget.value),
          })}
      />
      <div
        class="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1"
      >
        <span>Sparse</span>
        <span>Dense</span>
      </div>
    </div>

    <!-- Animation Level -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="vd-animation-level" class="text-sm text-[var(--theme-text)]"
          >Animation Level</label
        >
        <span class="text-xs text-[var(--theme-text-muted)]"
          >{Math.round($visualSettings.animation_level * 100)}%</span
        >
      </div>
      <input
        id="vd-animation-level"
        type="range"
        min="0"
        max="1"
        step="0.1"
        class="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer slider"
        value={$visualSettings.animation_level}
        oninput={(e) =>
          updateSettings({
            animation_level: parseFloat(e.currentTarget.value),
          })}
      />
      <div
        class="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1"
      >
        <span>Static</span>
        <span>Dynamic</span>
      </div>
    </div>
  </div>

  <!-- Typography -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Typography
    </h3>

    <!-- Font Family -->
    <div>
      <label
        for="vd-font-family"
        class="block text-sm font-medium text-[var(--theme-text)] mb-2"
        >Font Family</label
      >
      <select
        id="vd-font-family"
        class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
        value={$visualSettings.font_family}
        onchange={(e) => updateSettings({ font_family: e.currentTarget.value })}
      >
        {#each fontFamilies as font}
          <option value={font.value}>{font.label}</option>
        {/each}
      </select>
    </div>

    <!-- Font Scale -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="vd-font-scale" class="text-sm text-[var(--theme-text)]"
          >Font Scale</label
        >
        <span class="text-xs text-[var(--theme-text-muted)]"
          >{$visualSettings.font_scale.toFixed(1)}x</span
        >
      </div>
      <input
        id="vd-font-scale"
        type="range"
        min="0.8"
        max="1.5"
        step="0.1"
        class="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer slider"
        value={$visualSettings.font_scale}
        oninput={(e) =>
          updateSettings({ font_scale: parseFloat(e.currentTarget.value) })}
      />
    </div>
  </div>

  <!-- Effects -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Effects
    </h3>

    <!-- Enable Animations -->
    <div class="flex items-center justify-between">
      <label for="vd-enable-animations" class="text-sm text-[var(--theme-text)]"
        >Enable Animations</label
      >
      <input
        id="vd-enable-animations"
        type="checkbox"
        class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        checked={$visualSettings.enable_animations}
        onchange={(e) =>
          updateSettings({ enable_animations: e.currentTarget.checked })}
      />
    </div>

    <!-- Enable Blur Effects -->
    <div class="flex items-center justify-between">
      <label for="vd-enable-blur" class="text-sm text-[var(--theme-text)]"
        >Enable Blur Effects</label
      >
      <input
        id="vd-enable-blur"
        type="checkbox"
        class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        checked={$visualSettings.enable_blur_effects}
        onchange={(e) =>
          updateSettings({ enable_blur_effects: e.currentTarget.checked })}
      />
    </div>

    <!-- Reduce Motion -->
    <div class="flex items-center justify-between">
      <label for="vd-reduce-motion" class="text-sm text-[var(--theme-text)]"
        >Reduce Motion</label
      >
      <input
        id="vd-reduce-motion"
        type="checkbox"
        class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        checked={$visualSettings.reduce_motion}
        onchange={(e) =>
          updateSettings({ reduce_motion: e.currentTarget.checked })}
      />
    </div>
  </div>

  <!-- Grid & Layout -->
  <div class="space-y-4">
    <h3
      class="text-sm font-medium text-[var(--theme-text)] uppercase tracking-wide"
    >
      Grid & Layout
    </h3>

    <!-- Grid Size -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label for="vd-grid-size" class="text-sm text-[var(--theme-text)]"
          >Grid Size</label
        >
        <span class="text-xs text-[var(--theme-text-muted)]"
          >{$visualSettings.grid_size}px</span
        >
      </div>
      <input
        id="vd-grid-size"
        type="range"
        min="1"
        max="50"
        step="1"
        class="w-full h-2 bg-[var(--theme-border)] rounded-lg appearance-none cursor-pointer slider"
        value={$visualSettings.grid_size}
        oninput={(e) =>
          updateSettings({ grid_size: parseInt(e.currentTarget.value) })}
      />
      <div
        class="flex justify-between text-xs text-[var(--theme-text-muted)] mt-1"
      >
        <span>Fine (1px)</span>
        <span>Coarse (50px)</span>
      </div>
      <p class="text-xs text-[var(--theme-text-muted)] mt-1">
        Larger grid sizes improve drag performance
      </p>
    </div>

    <!-- Snap to Grid -->
    <div class="flex items-center justify-between">
      <label for="vd-snap-to-grid" class="text-sm text-[var(--theme-text)]"
        >Snap to Grid</label
      >
      <input
        id="vd-snap-to-grid"
        type="checkbox"
        class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        checked={$visualSettings.snap_to_grid}
        onchange={(e) =>
          updateSettings({ snap_to_grid: e.currentTarget.checked })}
      />
    </div>

    <!-- Show Grid -->
    <div class="flex items-center justify-between">
      <label for="vd-show-grid" class="text-sm text-[var(--theme-text)]"
        >Show Grid</label
      >
      <input
        id="vd-show-grid"
        type="checkbox"
        class="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        checked={$visualSettings.show_grid}
        onchange={(e) => updateSettings({ show_grid: e.currentTarget.checked })}
      />
    </div>
  </div>

  <!-- Actions -->
  <div class="pt-4 border-t border-[var(--theme-border)]">
    <button
      onclick={resetToDefaults}
      class="w-full px-4 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-background)]"
    >
      Reset to Defaults
    </button>
  </div>
</div>

<style>
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: var(--theme-primary);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: var(--theme-primary);
    cursor: pointer;
    border: none;
  }
</style>
