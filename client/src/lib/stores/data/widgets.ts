/**
 * Widget Data Management Store
 * Handles widget configurations, creation, updates, and deletion
 */

import { writable, derived, get } from 'svelte/store';
import type { WidgetConfig, WidgetGroup } from '$lib/types';
import { selectedWidgets } from '../core/ui';

// Core widget data
export const widgets = writable<Record<string, WidgetConfig>>({});
export const widgetGroups = writable<Record<string, WidgetGroup>>({});

// Derived stores
export const widgetArray = derived(
  widgets,
  ($widgets) => Object.values($widgets)
);

export const groupArray = derived(
  [widgetGroups],
  ([$widgetGroups]) => Object.values($widgetGroups)
);

// Selected widget configurations - derived from selectedWidgets and widgets
export const selectedWidgetConfigs = derived(
  [selectedWidgets, widgets],
  ([$selectedWidgets, $widgets]) => {
    if ($selectedWidgets.type === 'widget') {
      return $selectedWidgets.ids.map(id => $widgets[id]).filter(Boolean);
    }
    return [];
  }
);

export const widgetsByCategory = derived(
  [widgets],
  ([$widgets]) => {
    const categories: Record<string, WidgetConfig[]> = {};
    Object.values($widgets).forEach(widget => {
      // Get category from sensor data or use 'uncategorized'
      const category = 'general'; // This should be derived from sensor data
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(widget);
    });
    return categories;
  }
);

export const widgetCount = derived(
  [widgets],
  ([$widgets]) => Object.keys($widgets).length
);

// Widget management utilities
export const widgetUtils = {
  // Widget CRUD operations
  addWidget: (widget: WidgetConfig) => {
    widgets.update(store => ({
      ...store,
      [widget.id]: widget
    }));
    console.log(`[WidgetStore] Added widget: ${widget.id}`, widget);
  },

  updateWidget: (id: string, updates: Partial<WidgetConfig>) => {
    widgets.update(store => {
      if (!store[id]) {
        console.warn(`[WidgetStore] Widget ${id} not found for update`);
        return store;
      }
      return {
        ...store,
        [id]: {
          ...store[id],
          ...updates
        }
      };
    });
    console.log(`[WidgetStore] Updated widget: ${id}`, updates);
  },

  removeWidget: (id: string) => {
    widgets.update(store => {
      const newStore = { ...store };
      delete newStore[id];
      return newStore;
    });
    
    // Also remove from selection if selected
    selectedWidgets.update(selection => {
      if (selection.type === 'widget' && selection.ids.includes(id)) {
        return {
          ...selection,
          ids: selection.ids.filter(wid => wid !== id)
        };
      }
      return selection;
    });
    
    console.log(`[WidgetStore] Removed widget: ${id}`);
  },

  duplicateWidget: (id: string, offsetX = 20, offsetY = 20) => {
    const widget = get(widgets)[id];
    if (!widget) {
      console.warn(`[WidgetStore] Widget ${id} not found for duplication`);
      return null;
    }

    const newWidget: WidgetConfig = {
      ...widget,
      id: `${widget.id}_copy_${Date.now()}`,
      pos_x: widget.pos_x + offsetX,
      pos_y: widget.pos_y + offsetY,
    };

    widgetUtils.addWidget(newWidget);
    return newWidget.id;
  },

  // Widget positioning
  moveWidget: (id: string, x: number, y: number) => {
    widgetUtils.updateWidget(id, { pos_x: x, pos_y: y });
  },

  resizeWidget: (id: string, width: number, height: number) => {
    widgetUtils.updateWidget(id, { width, height });
  },

  rotateWidget: (id: string, rotation: number) => {
    widgetUtils.updateWidget(id, { rotation });
  },

  // Z-index management
  bringToFront: (id: string) => {
    const allWidgets = get(widgets);
    const maxZ = Math.max(...Object.values(allWidgets).map(w => w.z_index), 0);
    widgetUtils.updateWidget(id, { z_index: maxZ + 1 });
  },

  sendToBack: (id: string) => {
    const allWidgets = get(widgets);
    const minZ = Math.min(...Object.values(allWidgets).map(w => w.z_index), 0);
    widgetUtils.updateWidget(id, { z_index: minZ - 1 });
  },

  // Lock/unlock
  toggleLock: (id: string) => {
    const widget = get(widgets)[id];
    if (widget) {
      widgetUtils.updateWidget(id, { is_locked: !widget.is_locked });
    }
  },

  lockWidgets: (ids: string[]) => {
    ids.forEach(id => widgetUtils.updateWidget(id, { is_locked: true }));
  },

  unlockWidgets: (ids: string[]) => {
    ids.forEach(id => widgetUtils.updateWidget(id, { is_locked: false }));
  },

  // Group management
  addGroup: (group: WidgetGroup) => {
    widgetGroups.update(store => ({
      ...store,
      [group.id]: group
    }));
    console.log(`[WidgetStore] Added group: ${group.id}`);
  },

  updateGroup: (id: string, updates: Partial<WidgetGroup>) => {
    widgetGroups.update(store => ({
      ...store,
      [id]: { ...store[id], ...updates }
    }));
  },

  removeGroup: (id: string) => {
    const group = get(widgetGroups)[id];
    if (group) {
      // Remove group_id from all widgets in the group
      group.widgets.forEach(widgetId => {
        widgetUtils.updateWidget(widgetId, { group_id: undefined });
      });
    }
    
    // Remove the group
    widgetGroups.update(store => {
      const newStore = { ...store };
      delete newStore[id];
      return newStore;
    });
    
    console.log(`[WidgetStore] Removed group: ${id}`);
  },

  createGroupFromSelection: (name: string) => {
    const selection = get(selectedWidgets);
    if (selection.type !== 'widget' || selection.ids.length === 0) {
      console.warn('[WidgetStore] No widgets selected for grouping');
      return null;
    }

    const groupId = `group_${Date.now()}`;
    const allWidgets = get(widgets);
    
    // Calculate relative positions
    const firstWidget = allWidgets[selection.ids[0]];
    const relativePositions: Record<string, { x: number; y: number }> = {};
    
    selection.ids.forEach(id => {
      const widget = allWidgets[id];
      if (widget) {
        relativePositions[id] = {
          x: widget.pos_x - firstWidget.pos_x,
          y: widget.pos_y - firstWidget.pos_y
        };
        // Update widget to include group_id
        widgetUtils.updateWidget(id, { group_id: groupId });
      }
    });

    const group: WidgetGroup = {
      id: groupId,
      name,
      widgets: selection.ids,
      relative_positions: relativePositions,
      created_at: new Date().toISOString()
    };

    widgetUtils.addGroup(group);
    return groupId;
  },

  // Bulk operations
  clearAllWidgets: () => {
    widgets.set({});
    selectedWidgets.set({ type: 'widget', ids: [] });
    console.log('[WidgetStore] Cleared all widgets');
  },

  clearAllGroups: () => {
    // Clear group_id from all widgets
    const allWidgets = get(widgets);
    Object.keys(allWidgets).forEach(id => {
      if (allWidgets[id].group_id) {
        widgetUtils.updateWidget(id, { group_id: undefined });
      }
    });
    
    widgetGroups.set({});
    console.log('[WidgetStore] Cleared all groups');
  },

  // Export/import
  exportWidgets: () => {
    return {
      widgets: get(widgets),
      groups: get(widgetGroups),
      exportedAt: new Date().toISOString()
    };
  },

  importWidgets: (data: { widgets: Record<string, WidgetConfig>; groups: Record<string, WidgetGroup> }) => {
    widgets.set(data.widgets);
    widgetGroups.set(data.groups);
    console.log('[WidgetStore] Imported widgets and groups');
  },

  // Utility functions
  getWidget: (id: string) => get(widgets)[id],
  getGroup: (id: string) => get(widgetGroups)[id],
  hasWidget: (id: string) => id in get(widgets),
  hasGroup: (id: string) => id in get(widgetGroups),
}; 