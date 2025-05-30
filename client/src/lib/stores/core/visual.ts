/**
 * Visual Settings Store
 * Handles visual appearance settings like themes, grid, animations, etc.
 */

import { writable } from 'svelte/store';
import type { VisualSettings } from '$lib/types';

// Visual settings store
export const visualSettings = writable<VisualSettings>({
  // Core visual dimensions (0-1 range)
  materiality: 0.5,
  information_density: 0.5,
  animation_level: 0.5,
  
  // Color scheme
  color_scheme: 'professional',
  custom_colors: {},
  
  // Typography
  font_family: 'Inter',
  font_scale: 1.0,
  
  // Effects
  enable_blur_effects: false,
  enable_animations: true,
  reduce_motion: false,
  
  // Grid and layout
  grid_size: 10,
  snap_to_grid: true,
  show_grid: false
});

// Visual utilities
export const visualUtils = {
  updateSettings: (updates: Partial<VisualSettings>) => {
    visualSettings.update(settings => ({
      ...settings,
      ...updates
    }));
  },

  resetToDefaults: () => {
    visualSettings.set({
      materiality: 0.5,
      information_density: 0.5,
      animation_level: 0.5,
      color_scheme: 'professional',
      custom_colors: {},
      font_family: 'Inter',
      font_scale: 1.0,
      enable_blur_effects: false,
      enable_animations: true,
      reduce_motion: false,
      grid_size: 10,
      snap_to_grid: true,
      show_grid: false
    });
  },

  // Grid settings
  setGridSize: (size: number) => {
    visualSettings.update(settings => ({
      ...settings,
      grid_size: Math.max(1, Math.min(50, size))
    }));
  },

  toggleGrid: () => {
    visualSettings.update(settings => ({
      ...settings,
      show_grid: !settings.show_grid
    }));
  },

  toggleSnap: () => {
    visualSettings.update(settings => ({
      ...settings,
      snap_to_grid: !settings.snap_to_grid
    }));
  },

  // Animation settings
  setAnimationLevel: (level: number) => {
    visualSettings.update(settings => ({
      ...settings,
      animation_level: Math.max(0, Math.min(1, level))
    }));
  },

  toggleAnimations: () => {
    visualSettings.update(settings => ({
      ...settings,
      enable_animations: !settings.enable_animations
    }));
  },

  // Theme settings
  setColorScheme: (scheme: string) => {
    visualSettings.update(settings => ({
      ...settings,
      color_scheme: scheme
    }));
  },

  setCustomColor: (key: string, value: string) => {
    visualSettings.update(settings => ({
      ...settings,
      custom_colors: {
        ...settings.custom_colors,
        [key]: value
      }
    }));
  },

  // Typography
  setFontFamily: (family: string) => {
    visualSettings.update(settings => ({
      ...settings,
      font_family: family
    }));
  },

  setFontScale: (scale: number) => {
    visualSettings.update(settings => ({
      ...settings,
      font_scale: Math.max(0.5, Math.min(2.0, scale))
    }));
  },

  // Accessibility
  toggleReduceMotion: () => {
    visualSettings.update(settings => ({
      ...settings,
      reduce_motion: !settings.reduce_motion
    }));
  },

  toggleBlurEffects: () => {
    visualSettings.update(settings => ({
      ...settings,
      enable_blur_effects: !settings.enable_blur_effects
    }));
  }
}; 