<script lang="ts">
  import { visualSettings, visualUtils } from "$lib/stores";
  import type { VisualSettings } from "$lib/types";

  const colorSchemes = [
    {
      id: "professional",
      name: "Professional",
      description: "Clean, minimal, business-focused",
    },
    {
      id: "gamer",
      name: "Gamer HUD",
      description: "Dark theme with neon accents",
    },
    {
      id: "steampunk",
      name: "Steampunk",
      description: "Vintage industrial aesthetic",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      description: "Futuristic neon aesthetic",
    },
    { id: "custom", name: "Custom", description: "User-defined color scheme" },
  ];

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

  function resetToDefaults() {
    visualUtils.updateSettings({
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

  // Visual settings are applied centrally in the layout via the visualSettings
  // store subscription; this panel only updates the store.
</script>

<div class="p-4 space-y-6">
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
        >Theme Preset</label
      >
      <select
        id="vd-theme-preset"
        class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={$visualSettings.color_scheme}
        onchange={(e) =>
          updateSettings({ color_scheme: e.currentTarget.value })}
      >
        {#each colorSchemes as scheme}
          <option value={scheme.id}>{scheme.name}</option>
        {/each}
      </select>
      <p class="text-xs text-[var(--theme-text-muted)] mt-1">
        {colorSchemes.find((s) => s.id === $visualSettings.color_scheme)
          ?.description}
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
        class="w-full px-3 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
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
        class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
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
        class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
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
        class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
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
        class="rounded border-[var(--theme-border)] text-blue-600 focus:ring-blue-500"
        checked={$visualSettings.show_grid}
        onchange={(e) => updateSettings({ show_grid: e.currentTarget.checked })}
      />
    </div>
  </div>

  <!-- Actions -->
  <div class="pt-4 border-t border-[var(--theme-border)]">
    <button
      onclick={resetToDefaults}
      class="w-full px-4 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
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
    background: var(--theme-primary, #3b82f6);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: var(--theme-primary, #3b82f6);
    cursor: pointer;
    border: none;
  }
</style>
