<script lang="ts">
  import { 
    widgets, 
    widgetGroups, 
    selectedWidgets, 
    storeUtils 
  } from '$lib/stores';
  import { Users, Download, Upload, Plus, Trash2, Edit2 } from '@lucide/svelte';
  import type { WidgetGroup, WidgetConfig } from '$lib/types';

  let showCreateDialog = $state(false);
  let editingGroup = $state<WidgetGroup | null>(null);
  let newGroupName = $state('');
  let newGroupDescription = $state('');

  // Create a new group from selected widgets
  function createGroupFromSelection() {
    const selectedIds = $selectedWidgets.type === 'widget' ? $selectedWidgets.ids : [];
    if (selectedIds.length < 2) {
      alert('Please select at least 2 widgets to create a group');
      return;
    }

    const firstWidget = $widgets[selectedIds[0]];
    const relativePositions: Record<string, { x: number; y: number }> = {};
    
    // Calculate relative positions from the first widget
    selectedIds.forEach(id => {
      const widget = $widgets[id];
      if (widget) {
        relativePositions[id] = {
          x: widget.pos_x - firstWidget.pos_x,
          y: widget.pos_y - firstWidget.pos_y
        };
      }
    });

    const group: WidgetGroup = {
      id: crypto.randomUUID(),
      name: newGroupName || `Group ${Object.keys($widgetGroups).length + 1}`,
      description: newGroupDescription,
      widgets: selectedIds,
      relative_positions: relativePositions,
      created_at: new Date().toISOString()
    };

    // Update widgets to include group_id
    selectedIds.forEach(id => {
      storeUtils.updateWidget(id, { group_id: group.id });
    });

    storeUtils.addGroup(group);
    showCreateDialog = false;
    newGroupName = '';
    newGroupDescription = '';
  }

  // Ungroup widgets
  function ungroupWidgets(groupId: string) {
    const group = $widgetGroups[groupId];
    if (!group) return;

    // Remove group_id from all widgets in the group
    group.widgets.forEach(widgetId => {
      storeUtils.updateWidget(widgetId, { group_id: undefined });
    });

    // Remove the group
    storeUtils.removeGroup(groupId);
  }

  // Export group as JSON
  function exportGroup(group: WidgetGroup) {
    const groupWidgets = group.widgets.map(id => $widgets[id]).filter(Boolean);
    
    const exportData = {
      group,
      widgets: groupWidgets,
      version: '1.0',
      exported_at: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${group.name.replace(/\s+/g, '_')}_group.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import group from file
  function importGroup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') return;

          const importData = JSON.parse(result) as { group: WidgetGroup; widgets: WidgetConfig[] };
          
          if (importData.group && importData.widgets) {
            // Generate new IDs to avoid conflicts
            const oldToNewIds: Record<string, string> = {};
            const newGroup = { 
              ...importData.group, 
              id: crypto.randomUUID(),
              created_at: new Date().toISOString()
            };

            // Create new widgets with new IDs
            const newWidgets = importData.widgets.map((widget: WidgetConfig) => {
              const newId = crypto.randomUUID();
              oldToNewIds[widget.id] = newId;
              
              return {
                ...widget,
                id: newId,
                group_id: newGroup.id,
                // Position widgets in empty area
                pos_x: widget.pos_x + 200,
                pos_y: widget.pos_y + 200
              };
            });

            // Update relative positions with new IDs
            const newRelativePositions: Record<string, { x: number; y: number }> = {};
            Object.entries(newGroup.relative_positions).forEach(([oldId, pos]) => {
              const newId = oldToNewIds[oldId];
              if (newId) {
                newRelativePositions[newId] = pos;
              }
            });

            newGroup.relative_positions = newRelativePositions;
            newGroup.widgets = Object.values(oldToNewIds);

            // Add widgets and group
            newWidgets.forEach(widget => storeUtils.addWidget(widget));
            storeUtils.addGroup(newGroup);

            console.log('Successfully imported group:', newGroup.name);
          }
        } catch (error) {
          console.error('Failed to import group:', error);
          alert('Failed to import group. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  // Select all widgets in a group
  function selectGroup(group: WidgetGroup) {
    selectedWidgets.set({ type: 'widget', ids: group.widgets });
  }

  // Move group as a unit
  function moveGroup(groupId: string, deltaX: number, deltaY: number) {
    const group = $widgetGroups[groupId];
    if (!group) return;

    group.widgets.forEach(widgetId => {
      const widget = $widgets[widgetId];
      if (widget) {
        storeUtils.updateWidget(widgetId, {
          pos_x: widget.pos_x + deltaX,
          pos_y: widget.pos_y + deltaY
        });
      }
    });
  }
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2">
      <Users size={20} />
      Widget Groups
    </h3>
    
    <div class="flex items-center gap-2">
      <button
        onclick={() => showCreateDialog = true}
        disabled={$selectedWidgets.type !== 'widget' || $selectedWidgets.ids.length < 2}
        class="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        title="Create group from selected widgets"
      >
        <Plus size={14} />
        Create Group
      </button>
      
      <button
        onclick={importGroup}
        class="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1"
        title="Import group from file"
      >
        <Upload size={14} />
        Import
      </button>
    </div>
  </div>

  <!-- Groups List -->
  <div class="space-y-2">
    {#each Object.values($widgetGroups) as group (group.id)}
      <div class="border border-[var(--theme-border)] rounded-lg p-3 bg-[var(--theme-surface)]">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="font-medium text-[var(--theme-text)]">
              {group.name}
            </div>
            {#if group.description}
              <div class="text-sm text-[var(--theme-text-muted)] mt-1">
                {group.description}
              </div>
            {/if}
            <div class="text-xs text-[var(--theme-text-muted)] mt-2">
              {group.widgets.length} widget{group.widgets.length === 1 ? '' : 's'}
            </div>
          </div>
          
          <div class="flex items-center gap-1">
            <button
              onclick={() => selectGroup(group)}
              class="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors"
              title="Select group widgets"
            >
              <Users size={14} />
            </button>
            
            <button
              onclick={() => exportGroup(group)}
              class="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors"
              title="Export group"
            >
              <Download size={14} />
            </button>
            
            <button
              onclick={() => editingGroup = group}
              class="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors"
              title="Edit group"
            >
              <Edit2 size={14} />
            </button>
            
            <button
              onclick={() => ungroupWidgets(group.id)}
              class="p-1 text-red-500 hover:text-red-600 transition-colors"
              title="Ungroup widgets"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    {:else}
      <div class="text-center py-8 text-[var(--theme-text-muted)]">
        No groups created yet. Select multiple widgets and create a group.
      </div>
    {/each}
  </div>
</div>

<!-- Create Group Dialog -->
{#if showCreateDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-[var(--theme-surface)] rounded-lg p-6 w-96 border border-[var(--theme-border)]">
      <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-4">Create Widget Group</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Group Name
          </label>
          <input
            bind:value={newGroupName}
            type="text"
            placeholder="Enter group name"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)]"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Description (Optional)
          </label>
          <textarea
            bind:value={newGroupDescription}
            placeholder="Enter group description"
            rows="3"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)]"
          ></textarea>
        </div>
        
        <div class="text-sm text-[var(--theme-text-muted)]">
          {$selectedWidgets.ids.length} widgets will be grouped together.
        </div>
      </div>
      
      <div class="flex justify-end gap-2 mt-6">
        <button
          onclick={() => showCreateDialog = false}
          class="px-4 py-2 text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-background)]"
        >
          Cancel
        </button>
        <button
          onclick={createGroupFromSelection}
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Create Group
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Group Dialog -->
{#if editingGroup}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-[var(--theme-surface)] rounded-lg p-6 w-96 border border-[var(--theme-border)]">
      <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-4">Edit Group</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Group Name
          </label>
          <input
            bind:value={editingGroup.name}
            type="text"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)]"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-[var(--theme-text)] mb-1">
            Description
          </label>
          <textarea
            bind:value={editingGroup.description}
            rows="3"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)]"
          ></textarea>
        </div>
      </div>
      
      <div class="flex justify-end gap-2 mt-6">
        <button
          onclick={() => editingGroup = null}
          class="px-4 py-2 text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-background)]"
        >
          Cancel
        </button>
        <button
          onclick={() => {
            if (editingGroup) {
              storeUtils.updateGroup(editingGroup.id, {
                name: editingGroup.name,
                description: editingGroup.description
              });
              editingGroup = null;
            }
          }}
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}
