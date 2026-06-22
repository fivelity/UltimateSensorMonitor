<script lang="ts">
  import { get } from 'svelte/store';
  import { editMode, selectedWidgets, widgets, widgetGroups, storeUtils } from '$lib/stores';
  import type { ContextMenuState, Selection, WidgetConfig } from '$lib/types';

  interface Props {
    x: number;
    y: number;
    target?: ContextMenuState['target'];
    onfindInSidebar?: (sensorId: string) => void;
  }

  type MenuItem =
    | { label: string; action: string; icon?: string; danger?: boolean }
    | { type: 'divider' };

  const { x, y, target = undefined, onfindInSidebar }: Props = $props();

  let menuElement = $state<HTMLElement | undefined>(undefined);

  // Adjust position if menu would go off screen
  const adjustedX = $derived(Math.min(x, window.innerWidth - 200));
  const adjustedY = $derived(Math.min(y, window.innerHeight - 300));

  const menuItems = $derived(getMenuItems(target, $selectedWidgets, $widgets, $editMode));

  function handleAction(action: string) {
    const selectedWidgetsState = get(selectedWidgets);
    const widgetsMap = get(widgets);
    const widgetGroupsMap = get(widgetGroups);

    switch (action) {
      case 'select':
        if (target?.type === 'widget' && target.id) {
          storeUtils.selectWidget(target.id);
        }
        break;

      case 'find-in-sidebar':
        if (target?.type === 'widget' && target.id) {
          const widget = widgetsMap[target.id];
          if (widget?.sensor_id) {
            // Notify parent to handle sidebar navigation
            onfindInSidebar?.(widget.sensor_id);
          }
        }
        break;

      case 'lock':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          selectedWidgetsState.ids.forEach(id => {
            storeUtils.updateWidget(id, { is_locked: true });
          });
        }
        break;

      case 'unlock':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          selectedWidgetsState.ids.forEach(id => {
            storeUtils.updateWidget(id, { is_locked: false });
          });
        }
        break;

      case 'delete':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          selectedWidgetsState.ids.forEach(id => {
            storeUtils.removeWidget(id);
          });
          storeUtils.clearSelection();
        }
        break;

      case 'duplicate':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          selectedWidgetsState.ids.forEach(id => {
            const widget = widgetsMap[id];
            if (widget) {
              const newWidget = {
                ...widget,
                id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                pos_x: widget.pos_x + 20,
                pos_y: widget.pos_y + 20
              };
              storeUtils.addWidget(newWidget);
            }
          });
        }
        break;

      case 'bring-to-front':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          const maxZ = Math.max(...Object.values(widgetsMap).map(w => w.z_index)) + 1;
          selectedWidgetsState.ids.forEach(id => {
            storeUtils.updateWidget(id, { z_index: maxZ });
          });
        }
        break;

      case 'send-to-back':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          const minZ = Math.min(...Object.values(widgetsMap).map(w => w.z_index)) - 1;
          selectedWidgetsState.ids.forEach(id => {
            storeUtils.updateWidget(id, { z_index: minZ });
          });
        }
        break;

      case 'group':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 1) {
          // Create a new group from selected widgets
          const firstWidget = widgetsMap[selectedWidgetsState.ids[0]];
          const relativePositions: Record<string, { x: number; y: number }> = {};

          // Calculate relative positions from the first widget
          selectedWidgetsState.ids.forEach((id: string) => {
            const widget = widgetsMap[id];
            if (widget) {
              relativePositions[id] = {
                x: widget.pos_x - firstWidget.pos_x,
                y: widget.pos_y - firstWidget.pos_y
              };
            }
          });

          const newGroup = {
            id: crypto.randomUUID(),
            name: `Group ${Object.keys(widgetGroupsMap).length + 1}`,
            description: `Group of ${selectedWidgetsState.ids.length} widgets`,
            widgets: selectedWidgetsState.ids,
            relative_positions: relativePositions,
            created_at: new Date().toISOString()
          };

          // Update widgets to include group_id
          selectedWidgetsState.ids.forEach((id: string) => {
            storeUtils.updateWidget(id, { group_id: newGroup.id });
          });

          // Add the group
          storeUtils.addGroup(newGroup);

          console.log('Created group:', newGroup.name, 'with widgets:', selectedWidgetsState.ids);
        }
        break;

      case 'ungroup':
        if (selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.length > 0) {
          // Find groups that contain any of the selected widgets
          const groupsToRemove = new Set<string>();

          selectedWidgetsState.ids.forEach(widgetId => {
            const widget = widgetsMap[widgetId];
            if (widget?.group_id) {
              groupsToRemove.add(widget.group_id);
            }
          });

          // Remove each group
          groupsToRemove.forEach(groupId => {
            storeUtils.removeGroup(groupId);
          });

          console.log('Ungrouped widgets from groups:', Array.from(groupsToRemove));
        }
        break;
    }

    // Close menu after action
    storeUtils.hideContextMenu();
  }

  // Get context-specific menu items
  function getMenuItems(
    target: ContextMenuState['target'],
    selectedWidgetsState: Selection,
    widgetsMap: Record<string, WidgetConfig>,
    editMode: string
  ): MenuItem[] {
    const items: MenuItem[] = [];

    if (editMode !== 'edit') {
      return []; // No context menu in view mode
    }

    if (target?.type === 'widget' && target.id) {
      const widget = widgetsMap[target.id];
      const isSelected = selectedWidgetsState.type === 'widget' && selectedWidgetsState.ids.includes(target.id);
      const selectedCount = selectedWidgetsState.type === 'widget' ? selectedWidgetsState.ids.length : 0;

      if (!isSelected) {
        items.push({ label: 'Select', action: 'select', icon: 'cursor-click' });
        items.push({ type: 'divider' });
      }

      if (selectedCount > 0) {
        // Add Find in Sidebar option for single widget selection
        if (selectedCount === 1 && widget?.sensor_id) {
          items.push({ label: 'Find in Sidebar', action: 'find-in-sidebar', icon: 'search' });
          items.push({ type: 'divider' });
        }

        items.push({ label: 'Duplicate', action: 'duplicate', icon: 'duplicate' });
        items.push({ label: 'Delete', action: 'delete', icon: 'trash', danger: true });
        items.push({ type: 'divider' });

        // Lock/Unlock
        const hasLocked = selectedWidgetsState.ids.some((id: string) => widgetsMap[id]?.is_locked);
        const hasUnlocked = selectedWidgetsState.ids.some((id: string) => !widgetsMap[id]?.is_locked);

        if (hasUnlocked) {
          items.push({ label: 'Lock', action: 'lock', icon: 'lock-closed' });
        }
        if (hasLocked) {
          items.push({ label: 'Unlock', action: 'unlock', icon: 'lock-open' });
        }

        items.push({ type: 'divider' });
        items.push({ label: 'Bring to Front', action: 'bring-to-front', icon: 'arrow-up' });
        items.push({ label: 'Send to Back', action: 'send-to-back', icon: 'arrow-down' });

        if (selectedCount > 1) {
          items.push({ type: 'divider' });
          items.push({ label: 'Group', action: 'group', icon: 'collection' });
        }
      }
    } else if (target?.type === 'canvas') {
      // Canvas context menu
      const selectedCount = selectedWidgetsState.type === 'widget' ? selectedWidgetsState.ids.length : 0;
      
      if (selectedCount > 0) {
        items.push({ label: 'Clear Selection', action: 'clear-selection', icon: 'x' });
      }
    }

    return items;
  }

  function getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      'cursor-click': 'M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286.592zm-7.269-7.31l-1.358 5.072m0 0l2.51-2.224-.569 9.47L3.5 12.68l1.273-.318z',
      'search': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      'duplicate': 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
      'trash': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      'lock-closed': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      'lock-open': 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
      'arrow-up': 'M5 15l7-7 7 7',
      'arrow-down': 'M19 9l-7 7-7-7',
      'collection': 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      'x': 'M6 18L18 6M6 6l12 12'
    };
    return icons[iconName] || '';
  }
</script>

<!-- Menu positioned absolutely -->
<div
  bind:this={menuElement}
  class="context-menu fixed z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg shadow-lg py-1 min-w-48"
  style="left: {adjustedX}px; top: {adjustedY}px;"
  onclick={(e) => e.stopPropagation()}
>
  {#each menuItems as item}
    {#if item.type === 'divider'}
      <div class="h-px bg-[var(--theme-border)] my-1"></div>
    {:else}
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-background)] transition-colors flex items-center gap-2"
        class:text-red-600={item.danger}
        class:text-[var(--theme-text)]={!item.danger}
        onclick={() => handleAction(item.action)}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(item.icon)} />
        </svg>
        {item.label}
      </button>
    {/if}
  {/each}

  {#if menuItems.length === 0}
    <div class="px-3 py-2 text-sm text-[var(--theme-text-muted)]">
      No actions available
    </div>
  {/if}
</div>
