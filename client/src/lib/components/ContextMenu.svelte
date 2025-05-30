<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { editMode, selectedWidgets, widgets, widgetGroups, storeUtils } from '$lib/stores';
  import type { ContextMenuState } from '$lib/types';

  export let x: number;
  export let y: number;
  export let target: ContextMenuState['target'] = undefined;

  const dispatch = createEventDispatcher();

  let menuElement: HTMLElement;

  // Adjust position if menu would go off screen
  $: adjustedX = Math.min(x, window.innerWidth - 200);
  $: adjustedY = Math.min(y, window.innerHeight - 300);

  function handleAction(action: string) {
    const $selectedWidgets = get(selectedWidgets);
    const $widgets = get(widgets);
    const $widgetGroups = get(widgetGroups);

    switch (action) {
      case 'select':
        if (target?.type === 'widget' && target.id) {
          storeUtils.selectWidget(target.id);
        }
        break;

      case 'find-in-sidebar':
        if (target?.type === 'widget' && target.id) {
          const widget = $widgets[target.id];
          if (widget?.sensor_id) {
            // Dispatch custom event to main page to handle sidebar navigation
            dispatch('find-in-sidebar', { sensorId: widget.sensor_id });
          }
        }
        break;

      case 'lock':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          $selectedWidgets.ids.forEach(id => {
            storeUtils.updateWidget(id, { is_locked: true });
          });
        }
        break;

      case 'unlock':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          $selectedWidgets.ids.forEach(id => {
            storeUtils.updateWidget(id, { is_locked: false });
          });
        }
        break;

      case 'delete':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          $selectedWidgets.ids.forEach(id => {
            storeUtils.removeWidget(id);
          });
          storeUtils.clearSelection();
        }
        break;

      case 'duplicate':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          $selectedWidgets.ids.forEach(id => {
            const widget = $widgets[id];
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
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          const maxZ = Math.max(...Object.values($widgets).map(w => w.z_index)) + 1;
          $selectedWidgets.ids.forEach(id => {
            storeUtils.updateWidget(id, { z_index: maxZ });
          });
        }
        break;

      case 'send-to-back':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          const minZ = Math.min(...Object.values($widgets).map(w => w.z_index)) - 1;
          $selectedWidgets.ids.forEach(id => {
            storeUtils.updateWidget(id, { z_index: minZ });
          });
        }
        break;

      case 'group':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 1) {
          // Create a new group from selected widgets
          const firstWidget = $widgets[$selectedWidgets.ids[0]];
          const relativePositions: Record<string, { x: number; y: number }> = {};
          
          // Calculate relative positions from the first widget
          $selectedWidgets.ids.forEach((id: string) => {
            const widget = $widgets[id];
            if (widget) {
              relativePositions[id] = {
                x: widget.pos_x - firstWidget.pos_x,
                y: widget.pos_y - firstWidget.pos_y
              };
            }
          });

          const newGroup = {
            id: crypto.randomUUID(),
            name: `Group ${Object.keys($widgetGroups).length + 1}`,
            description: `Group of ${$selectedWidgets.ids.length} widgets`,
            widgets: $selectedWidgets.ids,
            relative_positions: relativePositions,
            created_at: new Date().toISOString()
          };

          // Update widgets to include group_id
          $selectedWidgets.ids.forEach((id: string) => {
            storeUtils.updateWidget(id, { group_id: newGroup.id });
          });

          // Add the group
          storeUtils.addGroup(newGroup);
          
          console.log('Created group:', newGroup.name, 'with widgets:', $selectedWidgets.ids);
        }
        break;

      case 'ungroup':
        if ($selectedWidgets.type === 'widget' && $selectedWidgets.ids.length > 0) {
          // Find groups that contain any of the selected widgets
          const groupsToRemove = new Set<string>();
          
          $selectedWidgets.ids.forEach(widgetId => {
            const widget = $widgets[widgetId];
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
  $: menuItems = getMenuItems(target, $selectedWidgets, $widgets, $editMode);

  function getMenuItems(target: any, selectedWidgets: any, widgets: any, editMode: string) {
    const items: any[] = [];

    if (editMode !== 'edit') {
      return []; // No context menu in view mode
    }

    if (target?.type === 'widget' && target.id) {
      const widget = widgets[target.id];
      const isSelected = selectedWidgets.type === 'widget' && selectedWidgets.ids.includes(target.id);
      const selectedCount = selectedWidgets.type === 'widget' ? selectedWidgets.ids.length : 0;

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
        const hasLocked = selectedWidgets.ids.some((id: string) => widgets[id]?.is_locked);
        const hasUnlocked = selectedWidgets.ids.some((id: string) => !widgets[id]?.is_locked);

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
      const selectedCount = selectedWidgets.type === 'widget' ? selectedWidgets.ids.length : 0;
      
      if (selectedCount > 0) {
        items.push({ label: 'Clear Selection', action: 'clear-selection', icon: 'x' });
      }
    }

    return items;
  }

  function getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      'cursor-click': 'M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59',
      'search': 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
      'duplicate': 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75',
      'trash': 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
      'lock-closed': 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
      'lock-open': 'M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
      'arrow-up': 'M4.5 15.75l7.5-7.5 7.5 7.5',
      'arrow-down': 'M19.5 8.25l-7.5 7.5-7.5-7.5',
      'collection': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
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
  on:click|stopPropagation
>
  {#each menuItems as item}
    {#if item.type === 'divider'}
      <div class="h-px bg-[var(--theme-border)] my-1"></div>
    {:else}
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-background)] transition-colors flex items-center gap-2"
        class:text-red-600={item.danger}
        class:text-[var(--theme-text)]={!item.danger}
        on:click={() => handleAction(item.action)}
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