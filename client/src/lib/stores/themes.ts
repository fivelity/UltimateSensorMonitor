/**
 * Advanced theme management for Ultimate Sensor Monitor
 * Supports multiple color schemes, visual effects, and dynamic theming
 */

import type { ColorScheme, ThemePreset, VisualSettings } from "$lib/types";
import { logger } from "$lib/utils/logger";
import { derived, writable } from "svelte/store";

// Define built-in color schemes
export const colorSchemes: Record<string, ColorScheme> = {
  professional: {
    id: "professional",
    name: "Professional",
    colors: {
      primary: "#3b82f6",
      secondary: "#6366f1",
      accent: "#8b5cf6",
      background: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",
      text: "#1e293b",
      text_muted: "#64748b",
      danger: "#ef4444",
      success: "#22c55e",
      warning: "#f59e0b",
    },
  },
  gamer_hud: {
    id: "gamer_hud",
    name: "Gamer HUD",
    colors: {
      primary: "#00ff41",
      secondary: "#ff0080",
      accent: "#ffff00",
      background: "#0a0a0a",
      surface: "#1a1a1a",
      border: "#333333",
      text: "#ffffff",
      text_muted: "#a0a0a0",
      danger: "#ff4444",
      success: "#00ff41",
      warning: "#ffff00",
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    colors: {
      primary: "#ff0080",
      secondary: "#00ffff",
      accent: "#ffff00",
      background: "#0f0f23",
      surface: "#1a1a2e",
      border: "#16213e",
      text: "#ffffff",
      text_muted: "#c7c7c7",
      danger: "#ff4444",
      success: "#00ff9d",
      warning: "#ffae00",
    },
  },
  glassmorphism: {
    id: "glassmorphism",
    name: "Glassmorphism",
    colors: {
      primary: "#38bdf8",
      secondary: "#818cf8",
      accent: "#c084fc",
      background: "#0f172a",
      surface: "rgba(255, 255, 255, 0.08)",
      border: "rgba(255, 255, 255, 0.12)",
      text: "#f8fafc",
      text_muted: "#94a3b8",
      danger: "#f87171",
      success: "#4ade80",
      warning: "#fbbf24",
    },
  },
  minimalist: {
    id: "minimalist",
    name: "Minimalist",
    colors: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#999999",
      background: "#ffffff",
      surface: "#fafafa",
      border: "#e0e0e0",
      text: "#000000",
      text_muted: "#666666",
      danger: "#dc2626",
      success: "#16a34a",
      warning: "#ca8a04",
    },
  },
  synthwave: {
    id: "synthwave",
    name: "Synthwave",
    colors: {
      primary: "#ff006e",
      secondary: "#8338ec",
      accent: "#ffbe0b",
      background: "#0d1b2a",
      surface: "#1e1b3b",
      border: "#415a77",
      text: "#ffffff",
      text_muted: "#a8dadc",
      danger: "#ff4444",
      success: "#06ffa5",
      warning: "#ffbe0b",
    },
  },
  nature: {
    id: "nature",
    name: "Nature",
    colors: {
      primary: "#22c55e",
      secondary: "#059669",
      accent: "#84cc16",
      background: "#f0fdf4",
      surface: "#ffffff",
      border: "#d1fae5",
      text: "#14532d",
      text_muted: "#16a34a",
      danger: "#ef4444",
      success: "#22c55e",
      warning: "#f59e0b",
    },
  },
};

// Define built-in theme presets
export const themePresets: Record<string, ThemePreset> = {
  professional_default: {
    id: "professional_default",
    name: "Professional",
    description: "Clean and minimal for business environments",
    visual_settings: {
      materiality: 0.3,
      information_density: 0.5,
      animation_level: 0.4,
      enable_blur_effects: false,
      enable_animations: true,
    },
    color_scheme: colorSchemes.professional,
  },
  gamer_immersive: {
    id: "gamer_immersive",
    name: "Gamer HUD",
    description: "Full HUD experience with neon accents",
    visual_settings: {
      materiality: 0.8,
      information_density: 0.7,
      animation_level: 0.9,
      enable_blur_effects: true,
      enable_animations: true,
    },
    color_scheme: colorSchemes.gamer_hud,
  },
  cyberpunk_matrix: {
    id: "cyberpunk_matrix",
    name: "Cyberpunk",
    description: "High-tech cyberpunk aesthetic",
    visual_settings: {
      materiality: 0.9,
      information_density: 0.8,
      animation_level: 0.8,
      enable_blur_effects: true,
      enable_animations: true,
    },
    color_scheme: colorSchemes.cyberpunk,
  },
  glassmorphism_modern: {
    id: "glassmorphism_modern",
    name: "Glassmorphism",
    description: "Modern translucent layers with blur effects",
    visual_settings: {
      materiality: 0.9,
      information_density: 0.6,
      animation_level: 0.6,
      enable_blur_effects: true,
      enable_animations: true,
    },
    color_scheme: colorSchemes.glassmorphism,
  },
  minimalist_zen: {
    id: "minimalist_zen",
    name: "Minimalist Zen",
    description: "Clean and distraction-free",
    visual_settings: {
      materiality: 0.1,
      information_density: 0.3,
      animation_level: 0.2,
      enable_blur_effects: false,
      enable_animations: false,
    },
    color_scheme: colorSchemes.minimalist,
  },
  synthwave_retro: {
    id: "synthwave_retro",
    name: "Synthwave",
    description: "80s retrowave vibes",
    visual_settings: {
      materiality: 0.7,
      information_density: 0.6,
      animation_level: 0.7,
      enable_blur_effects: true,
      enable_animations: true,
    },
    color_scheme: colorSchemes.synthwave,
  },
  nature_fresh: {
    id: "nature_fresh",
    name: "Nature",
    description: "Fresh and organic",
    visual_settings: {
      materiality: 0.3,
      information_density: 0.5,
      animation_level: 0.4,
      enable_blur_effects: false,
      enable_animations: true,
    },
    color_scheme: colorSchemes.nature,
  },
};

// Theme store
export const currentTheme = writable<string>("professional_default");
export const customColorScheme = writable<ColorScheme | null>(null);

// Derived stores
export const activeColorScheme = derived(
  [currentTheme, customColorScheme],
  ([$currentTheme, $customColorScheme]) => {
    if ($customColorScheme) {
      return $customColorScheme;
    }

    const preset = themePresets[$currentTheme];
    return preset ? preset.color_scheme : colorSchemes.professional;
  },
);

export const activeThemePreset = derived([currentTheme], ([$currentTheme]) => {
  return themePresets[$currentTheme] || themePresets.professional_default;
});

// Convert hex or rgba color to RGB string for use with opacity modifiers
function hexToRgb(color: string): string {
  const rgbaMatch = color.match(
    /rgba?\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/,
  );
  if (rgbaMatch) {
    return `${rgbaMatch[1]} ${rgbaMatch[2]} ${rgbaMatch[3]}`;
  }

  const clean = color.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return "128 128 128";
  }

  // Handle 3-digit hex
  if (clean.length === 3) {
    const r = ((num >> 8) & 0xf) * 17;
    const g = ((num >> 4) & 0xf) * 17;
    const b = (num & 0xf) * 17;
    return `${r} ${g} ${b}`;
  }

  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

// Theme utility functions
export const themeUtils = {
  // Get a color scheme by ID
  getColorScheme: (schemeId: string): ColorScheme => {
    return colorSchemes[schemeId] || colorSchemes.professional;
  },

  // Get a theme preset by ID
  getThemePreset: (themeId: string): ThemePreset => {
    return themePresets[themeId] || themePresets.professional_default;
  },

  // Find the theme preset that matches a color scheme ID
  getThemePresetForColorScheme: (schemeId: string): ThemePreset | undefined => {
    return Object.values(themePresets).find(
      (preset) => preset.color_scheme.id === schemeId,
    );
  },

  // Apply theme to CSS custom properties
  applyTheme: (scheme: ColorScheme, visualSettings?: Partial<VisualSettings>) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Apply base colors
    Object.entries(scheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace("_", "-")}`, value);
      root.style.setProperty(
        `--theme-${key.replace("_", "-")}-rgb`,
        hexToRgb(value),
      );
    });

    // Apply materiality-based glassmorphism tokens
    const materiality = Math.max(0, Math.min(1, visualSettings?.materiality ?? 0.5));
    const enableBlur = visualSettings?.enable_blur_effects ?? false;

    const surfaceOpacity = Math.min(0.85, 0.05 + materiality * 0.4);
    const blurAmount = enableBlur ? Math.round(2 + materiality * 18) : 0;
    const shadowOpacity = Math.min(0.4, 0.05 + materiality * 0.25);
    const surfaceBlend = Math.min(0.35, materiality * 0.35);

    root.style.setProperty(
      "--theme-surface-opacity",
      surfaceOpacity.toFixed(2),
    );
    root.style.setProperty("--theme-backdrop-blur", `${blurAmount}px`);
    root.style.setProperty(
      "--theme-elevation-opacity",
      shadowOpacity.toFixed(2),
    );
    root.style.setProperty("--theme-surface-blend", surfaceBlend.toFixed(2));

    // Apply surface color with dynamic opacity for glassmorphism
    const surfaceColor = scheme.colors.surface;
    if (surfaceColor.startsWith("rgba")) {
      root.style.setProperty("--theme-surface-glass", surfaceColor);
    } else {
      root.style.setProperty(
        "--theme-surface-glass",
        `rgba(${hexToRgb(surfaceColor)}, ${surfaceOpacity.toFixed(2)})`,
      );
    }
  },

  // Get all available themes
  getAvailableThemes: () => {
    return Object.values(themePresets);
  },

  // Get all available color schemes
  getAvailableColorSchemes: () => {
    return Object.values(colorSchemes);
  },

  // Create custom color scheme
  createCustomColorScheme: (
    name: string,
    colors: ColorScheme["colors"],
  ): ColorScheme => {
    return {
      id: `custom_${Date.now()}`,
      name,
      colors,
    };
  },

  // Generate theme variations
  generateThemeVariation: (
    baseScheme: ColorScheme,
    adjustment: "darker" | "lighter" | "saturated" | "desaturated",
  ): ColorScheme => {
    const adjustColor = (hex: string): string => {
      // Simple color adjustment - in a real app, use a proper color library
      const num = parseInt(hex.replace("#", ""), 16);
      let r = (num >> 16) & 255;
      let g = (num >> 8) & 255;
      let b = num & 255;

      switch (adjustment) {
        case "darker":
          r = Math.max(0, r - 20);
          g = Math.max(0, g - 20);
          b = Math.max(0, b - 20);
          break;
        case "lighter":
          r = Math.min(255, r + 20);
          g = Math.min(255, g + 20);
          b = Math.min(255, b + 20);
          break;
        case "saturated": {
          // Increase saturation (simplified)
          const avg = (r + g + b) / 3;
          r = Math.min(255, r + (r - avg) * 0.2);
          g = Math.min(255, g + (g - avg) * 0.2);
          b = Math.min(255, b + (b - avg) * 0.2);
          break;
        }
        case "desaturated": {
          // Decrease saturation
          const average = (r + g + b) / 3;
          r = r + (average - r) * 0.3;
          g = g + (average - g) * 0.3;
          b = b + (average - b) * 0.3;
          break;
        }
      }

      return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
    };

    const adjustedColors = Object.fromEntries(
      Object.entries(baseScheme.colors).map(([key, color]) => [
        key,
        adjustColor(color),
      ]),
    ) as ColorScheme["colors"];

    return {
      id: `${baseScheme.id}_${adjustment}`,
      name: `${baseScheme.name} (${adjustment})`,
      colors: adjustedColors,
    };
  },

  // Export theme configuration
  exportTheme: (themeId: string) => {
    const preset = themePresets[themeId];
    if (!preset) return null;

    return {
      name: preset.name,
      description: preset.description,
      color_scheme: preset.color_scheme,
      visual_settings: preset.visual_settings,
      exported_at: new Date().toISOString(),
      version: "1.0",
    };
  },

  // Import theme configuration
  importTheme: (themeData: Record<string, unknown>): ThemePreset | null => {
    try {
      const imported: ThemePreset = {
        id: `imported_${Date.now()}`,
        name:
          typeof themeData.name === "string"
            ? themeData.name
            : "Imported Theme",
        description:
          typeof themeData.description === "string"
            ? themeData.description
            : "Imported theme configuration",
        color_scheme: themeData.color_scheme as ColorScheme,
        visual_settings: themeData.visual_settings as Partial<VisualSettings>,
      };

      return imported;
    } catch (error) {
      logger.error("Failed to import theme:", error);
      return null;
    }
  },
};

// Auto-apply theme when the active color scheme changes
if (typeof window !== "undefined") {
  activeColorScheme.subscribe((scheme) => {
    themeUtils.applyTheme(scheme);
  });

  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem("ultimon-current-theme");
  if (savedTheme && themePresets[savedTheme]) {
    currentTheme.set(savedTheme);
  }

  // Save theme changes
  currentTheme.subscribe((theme) => {
    localStorage.setItem("ultimon-current-theme", theme);
  });
}
