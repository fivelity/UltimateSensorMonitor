/**
 * Advanced theme management for Ultimate Sensor Monitor
 * Supports multiple color schemes, visual effects, and dynamic theming
 */

import { writable, derived } from 'svelte/store';
import type { ColorScheme, ThemePreset, VisualSettings } from '$lib/types';

// Define built-in color schemes
export const colorSchemes: Record<string, ColorScheme> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      background: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#1e293b',
      text_muted: '#64748b'
    }
  },
  gamer_hud: {
    id: 'gamer_hud',
    name: 'Gamer HUD',
    colors: {
      primary: '#00ff41',
      secondary: '#ff0080',
      accent: '#ffff00',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      border: '#333333',
      text: '#ffffff',
      text_muted: '#a0a0a0'
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      primary: '#ff0080',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#0f0f23',
      surface: '#1a1a2e',
      border: '#16213e',
      text: '#ffffff',
      text_muted: '#c7c7c7'
    }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#999999',
      background: '#ffffff',
      surface: '#fafafa',
      border: '#e0e0e0',
      text: '#000000',
      text_muted: '#666666'
    }
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    colors: {
      primary: '#ff006e',
      secondary: '#8338ec',
      accent: '#ffbe0b',
      background: '#0d1b2a',
      surface: '#1e1b3b',
      border: '#415a77',
      text: '#ffffff',
      text_muted: '#a8dadc'
    }
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    colors: {
      primary: '#22c55e',
      secondary: '#059669',
      accent: '#84cc16',
      background: '#f0fdf4',
      surface: '#ffffff',
      border: '#d1fae5',
      text: '#14532d',
      text_muted: '#16a34a'
    }
  }
};

// Define built-in theme presets
export const themePresets: Record<string, ThemePreset> = {
  professional_default: {
    id: 'professional_default',
    name: 'Professional Default',
    description: 'Clean and minimal for business environments',
    visual_settings: {
      materiality: 0.3,
      information_density: 0.5,
      animation_level: 0.4,
      enable_blur_effects: false,
      enable_animations: true
    },
    color_scheme: colorSchemes.professional
  },
  gamer_immersive: {
    id: 'gamer_immersive',
    name: 'Gamer Immersive',
    description: 'Full HUD experience with effects',
    visual_settings: {
      materiality: 0.8,
      information_density: 0.7,
      animation_level: 0.9,
      enable_blur_effects: true,
      enable_animations: true
    },
    color_scheme: colorSchemes.gamer_hud
  },
  cyberpunk_matrix: {
    id: 'cyberpunk_matrix',
    name: 'Cyberpunk Matrix',
    description: 'High-tech cyberpunk aesthetic',
    visual_settings: {
      materiality: 0.9,
      information_density: 0.8,
      animation_level: 0.8,
      enable_blur_effects: true,
      enable_animations: true
    },
    color_scheme: colorSchemes.cyberpunk
  },
  minimalist_zen: {
    id: 'minimalist_zen',
    name: 'Minimalist Zen',
    description: 'Clean and distraction-free',
    visual_settings: {
      materiality: 0.1,
      information_density: 0.3,
      animation_level: 0.2,
      enable_blur_effects: false,
      enable_animations: false
    },
    color_scheme: colorSchemes.minimalist
  },
  synthwave_retro: {
    id: 'synthwave_retro',
    name: 'Synthwave Retro',
    description: '80s retrowave vibes',
    visual_settings: {
      materiality: 0.7,
      information_density: 0.6,
      animation_level: 0.7,
      enable_blur_effects: true,
      enable_animations: true
    },
    color_scheme: colorSchemes.synthwave
  }
};

// Theme store
export const currentTheme = writable<string>('professional_default');
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
  }
);

export const activeThemePreset = derived(
  [currentTheme],
  ([$currentTheme]) => {
    return themePresets[$currentTheme] || themePresets.professional_default;
  }
);

// Theme utility functions
export const themeUtils = {
  // Apply theme to CSS custom properties
  applyTheme: (scheme: ColorScheme) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    Object.entries(scheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace('_', '-')}`, value);
    });
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
  createCustomColorScheme: (name: string, colors: ColorScheme['colors']): ColorScheme => {
    return {
      id: `custom_${Date.now()}`,
      name,
      colors
    };
  },

  // Generate theme variations
  generateThemeVariation: (baseScheme: ColorScheme, adjustment: 'darker' | 'lighter' | 'saturated' | 'desaturated'): ColorScheme => {
    const adjustColor = (hex: string): string => {
      // Simple color adjustment - in a real app, use a proper color library
      const num = parseInt(hex.replace('#', ''), 16);
      let r = (num >> 16) & 255;
      let g = (num >> 8) & 255;
      let b = num & 255;

      switch (adjustment) {
        case 'darker':
          r = Math.max(0, r - 20);
          g = Math.max(0, g - 20);
          b = Math.max(0, b - 20);
          break;
        case 'lighter':
          r = Math.min(255, r + 20);
          g = Math.min(255, g + 20);
          b = Math.min(255, b + 20);
          break;
        case 'saturated':
          // Increase saturation (simplified)
          const avg = (r + g + b) / 3;
          r = Math.min(255, r + (r - avg) * 0.2);
          g = Math.min(255, g + (g - avg) * 0.2);
          b = Math.min(255, b + (b - avg) * 0.2);
          break;
        case 'desaturated':
          // Decrease saturation
          const average = (r + g + b) / 3;
          r = r + (average - r) * 0.3;
          g = g + (average - g) * 0.3;
          b = b + (average - b) * 0.3;
          break;
      }

      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    };

    const adjustedColors = Object.fromEntries(
      Object.entries(baseScheme.colors).map(([key, color]) => [
        key,
        adjustColor(color)
      ])
    ) as ColorScheme['colors'];

    return {
      id: `${baseScheme.id}_${adjustment}`,
      name: `${baseScheme.name} (${adjustment})`,
      colors: adjustedColors
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
      version: '1.0'
    };
  },

  // Import theme configuration
  importTheme: (themeData: Record<string, unknown>): ThemePreset | null => {
    try {
      const imported: ThemePreset = {
        id: `imported_${Date.now()}`,
        name: typeof themeData.name === 'string' ? themeData.name : 'Imported Theme',
        description: typeof themeData.description === 'string' ? themeData.description : 'Imported theme configuration',
        color_scheme: themeData.color_scheme as ColorScheme,
        visual_settings: themeData.visual_settings as Partial<VisualSettings>
      };

      return imported;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }
};

// Auto-apply theme when it changes
if (typeof window !== 'undefined') {
  activeColorScheme.subscribe(scheme => {
    themeUtils.applyTheme(scheme);
  });

  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem('ultimon-current-theme');
  if (savedTheme && themePresets[savedTheme]) {
    currentTheme.set(savedTheme);
  }

  // Save theme changes
  currentTheme.subscribe(theme => {
    localStorage.setItem('ultimon-current-theme', theme);
  });
} 