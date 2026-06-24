<script lang="ts">
  import {
    inspectorStore,
    selectedWidgets,
    widgetGroups,
    widgets,
    widgetUtils,
  } from "$lib/stores";
  import {
    AddWidgetCommand,
    BatchCommand,
    DeleteGroupCommand,
    GroupWidgetsCommand,
    historyStore,
    UpdateGroupCommand,
  } from "$lib/stores/history";
  import type { Bounds, WidgetConfig, WidgetGroup } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import {
    Check,
    Crosshair,
    Download,
    Palette,
    Plus,
    Trash2,
    Upload,
    Users,
    X,
  } from "@lucide/svelte";
  import GroupTagColorPicker from "./GroupTagColorPicker.svelte";

  interface Props {
    onlocateGroup?: (_bounds: Bounds) => void;
  }

  const { onlocateGroup }: Props = $props();

  let showCreateDialog = $state(false);
  let newGroupName = $state("");
  let newGroupDescription = $state("");
  let editingGroupId = $state<string | null>(null);
  let editName = $state("");
  let editDescription = $state("");
  let confirmingDeleteId = $state<string | null>(null);

  function createGroupFromSelection() {
    const selectedIds =
      $selectedWidgets.type === "widget" ? $selectedWidgets.ids : [];
    if (selectedIds.length < 2) {
      alert("Please select at least 2 widgets to create a group");
      return;
    }

    const firstWidget = $widgets[selectedIds[0]];
    const relativePositions: Record<string, { x: number; y: number }> = {};

    selectedIds.forEach((id) => {
      const widget = $widgets[id];
      if (widget) {
        relativePositions[id] = {
          x: widget.pos_x - firstWidget.pos_x,
          y: widget.pos_y - firstWidget.pos_y,
        };
      }
    });

    const group: WidgetGroup = {
      id: crypto.randomUUID(),
      name: newGroupName || `Group ${Object.keys($widgetGroups).length + 1}`,
      description: newGroupDescription,
      widgets: selectedIds,
      relative_positions: relativePositions,
      created_at: new Date().toISOString(),
    };

    historyStore.executeCommand(
      new GroupWidgetsCommand(
        group,
        selectedIds,
        widgetUtils.addGroup,
        widgetUtils.removeGroup,
        widgetUtils.updateWidget,
      ),
    );
    showCreateDialog = false;
    newGroupName = "";
    newGroupDescription = "";
  }

  function ungroupWidgets(groupId: string) {
    const group = $widgetGroups[groupId];
    if (!group) return;

    historyStore.executeCommand(
      new DeleteGroupCommand(
        group,
        group.widgets,
        widgetUtils.removeGroup,
        widgetUtils.addGroup,
        widgetUtils.updateWidget,
      ),
    );
    if ($inspectorStore.selectedGroupId === groupId) {
      inspectorStore.setSelectedGroupId(null);
    }
  }

  function exportGroup(group: WidgetGroup) {
    const groupWidgets = group.widgets
      .map((id) => $widgets[id])
      .filter(Boolean);

    const exportData = {
      group,
      widgets: groupWidgets,
      version: "1.0",
      exported_at: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${group.name.replace(/\s+/g, "_")}_group.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importGroup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== "string") return;

          const importData = JSON.parse(result) as {
            group: WidgetGroup;
            widgets: WidgetConfig[];
          };

          if (importData.group && importData.widgets) {
            const existingIds = new Set(Object.keys($widgetGroups));
            if (existingIds.has(importData.group.id)) {
              const confirmed = confirm(
                `A group with ID "${importData.group.id}" already exists. Continue and create a new copy?`,
              );
              if (!confirmed) return;
            }

            const oldToNewIds: Record<string, string> = {};
            const newGroup = {
              ...importData.group,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            };

            const newWidgets = importData.widgets.map(
              (widget: WidgetConfig) => {
                const newId = crypto.randomUUID();
                oldToNewIds[widget.id] = newId;

                return {
                  ...widget,
                  id: newId,
                  group_id: newGroup.id,
                  pos_x: widget.pos_x + 200,
                  pos_y: widget.pos_y + 200,
                };
              },
            );

            const newRelativePositions: Record<
              string,
              { x: number; y: number }
            > = {};
            Object.entries(newGroup.relative_positions).forEach(
              ([oldId, pos]) => {
                const newId = oldToNewIds[oldId];
                if (newId) {
                  newRelativePositions[newId] = pos;
                }
              },
            );

            newGroup.relative_positions = newRelativePositions;
            newGroup.widgets = Object.values(oldToNewIds);

            const commands = [
              ...newWidgets.map(
                (widget) =>
                  new AddWidgetCommand(
                    widget,
                    widgetUtils.addWidget,
                    widgetUtils.removeWidget,
                  ),
              ),
              new GroupWidgetsCommand(
                newGroup,
                newGroup.widgets,
                widgetUtils.addGroup,
                widgetUtils.removeGroup,
                widgetUtils.updateWidget,
              ),
            ];
            historyStore.executeCommand(
              new BatchCommand(commands, `Import group "${newGroup.name}"`),
            );
          }
        } catch (error) {
          logger.error("Failed to import group:", error);
          alert("Failed to import group. Please check the file format.");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  function selectGroup(group: WidgetGroup) {
    selectedWidgets.set({ type: "widget", ids: group.widgets });
    inspectorStore.setSelectedGroupId(group.id);
  }

  function locateGroup(group: WidgetGroup) {
    const groupWidgets = group.widgets
      .map((id) => $widgets[id])
      .filter((w): w is WidgetConfig => Boolean(w));
    if (groupWidgets.length === 0) return;

    const minX = Math.min(...groupWidgets.map((w) => w.pos_x));
    const minY = Math.min(...groupWidgets.map((w) => w.pos_y));
    const maxX = Math.max(...groupWidgets.map((w) => w.pos_x + w.width));
    const maxY = Math.max(...groupWidgets.map((w) => w.pos_y + w.height));

    const bounds: Bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    selectGroup(group);
    onlocateGroup?.(bounds);
  }

  function startInlineEdit(group: WidgetGroup) {
    editingGroupId = group.id;
    editName = group.name;
    editDescription = group.description || "";
  }

  function saveInlineEdit(group: WidgetGroup) {
    const oldValues = {
      name: group.name,
      description: group.description,
    };
    const newValues = {
      name: editName || group.name,
      description: editDescription || undefined,
    };
    historyStore.executeCommand(
      new UpdateGroupCommand(
        group.id,
        oldValues,
        newValues,
        widgetUtils.updateGroup,
      ),
    );
    editingGroupId = null;
  }

  function cancelInlineEdit() {
    editingGroupId = null;
    editName = "";
    editDescription = "";
  }

  function handleInlineKeydown(
    event: KeyboardEvent,
    group: WidgetGroup,
    field: "name" | "description",
  ) {
    if (event.key === "Enter" && field === "name") {
      event.preventDefault();
      saveInlineEdit(group);
    } else if (event.key === "Escape") {
      cancelInlineEdit();
    }
  }

  function updateTagColor(group: WidgetGroup, color: string | null) {
    historyStore.executeCommand(
      new UpdateGroupCommand(
        group.id,
        { tag_color: group.tag_color ?? undefined },
        { tag_color: color ?? undefined },
        widgetUtils.updateGroup,
      ),
    );
  }

  function requestDelete(groupId: string) {
    const group = $widgetGroups[groupId];
    if (!group) return;
    if (group.widgets.length > 0) {
      confirmingDeleteId = groupId;
    } else {
      ungroupWidgets(groupId);
    }
  }

  function confirmDelete() {
    if (confirmingDeleteId) {
      ungroupWidgets(confirmingDeleteId);
      confirmingDeleteId = null;
    }
  }

  function cancelDelete() {
    confirmingDeleteId = null;
  }

  function getGroupWidgetCount(group: WidgetGroup): number {
    return group.widgets.filter((id) => $widgets[id]).length;
  }
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center justify-between">
    <h3
      class="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2"
    >
      <Users size={20} />
      Widget Groups
    </h3>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (showCreateDialog = true)}
        disabled={$selectedWidgets.type !== "widget" ||
          $selectedWidgets.ids.length < 2}
        class="px-3 py-1 text-sm bg-[var(--theme-success)] text-[var(--theme-background)] rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--theme-success)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
        title="Create group from selected widgets"
      >
        <Plus size={14} />
        Create Group
      </button>

      <button
        type="button"
        onclick={importGroup}
        class="px-3 py-1 text-sm bg-[var(--theme-primary)] text-[var(--theme-background)] rounded-md hover:opacity-90 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
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
      {@const isEditing = editingGroupId === group.id}
      {@const isHighlighted = $inspectorStore.selectedGroupId === group.id}
      {@const widgetCount = getGroupWidgetCount(group)}
      <div
        class="border border-[var(--theme-border)] rounded-lg p-3 bg-[var(--theme-background)] transition-colors {isHighlighted
          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5'
          : ''}"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            {#if isEditing}
              <div class="space-y-2">
                <input
                  type="text"
                  bind:value={editName}
                  placeholder="Group name"
                  class="w-full px-2 py-1 text-sm bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
                  onkeydown={(e) => handleInlineKeydown(e, group, "name")}
                />
                <textarea
                  bind:value={editDescription}
                  placeholder="Description (optional)"
                  rows="2"
                  class="w-full px-2 py-1 text-sm bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none resize-none"
                ></textarea>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={() => saveInlineEdit(group)}
                    class="p-1 rounded text-[var(--theme-success)] hover:bg-[var(--theme-success)]/10 transition-colors"
                    title="Save"
                    aria-label="Save group changes"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onclick={cancelInlineEdit}
                    class="p-1 rounded text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] transition-colors"
                    title="Cancel"
                    aria-label="Cancel group changes"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            {:else}
              <div class="flex items-center gap-2 mb-1">
                {#if group.tag_color}
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    style="background: {group.tag_color};"
                  ></span>
                {/if}
                <div class="font-medium text-[var(--theme-text)] truncate">
                  {group.name}
                </div>
              </div>
              {#if group.description}
                <div class="text-sm text-[var(--theme-text-muted)]">
                  {group.description}
                </div>
              {/if}
              <div class="text-xs text-[var(--theme-text-muted)] mt-2">
                {widgetCount} widget{widgetCount === 1 ? "" : "s"}
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onclick={() => locateGroup(group)}
              class="p-1.5 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              title="Locate group on canvas"
              aria-label="Locate group on canvas"
            >
              <Crosshair size={14} />
            </button>

            <button
              type="button"
              onclick={() => selectGroup(group)}
              class="p-1.5 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              title="Select group widgets"
              aria-label="Select group widgets"
            >
              <Users size={14} />
            </button>

            <button
              type="button"
              onclick={() => exportGroup(group)}
              class="p-1.5 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              title="Export group"
              aria-label="Export group"
            >
              <Download size={14} />
            </button>

            <button
              type="button"
              onclick={() => startInlineEdit(group)}
              class="p-1.5 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              title="Edit group"
              aria-label="Edit group"
            >
              <Palette size={14} />
            </button>

            <button
              type="button"
              onclick={() => requestDelete(group.id)}
              class="p-1.5 rounded text-[var(--theme-danger)] hover:opacity-80 hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)]"
              title="Ungroup widgets"
              aria-label="Ungroup widgets"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <!-- Tag color picker (visible when editing or on hover focus) -->
        {#if isEditing}
          <div class="mt-3 pt-3 border-t border-[var(--theme-border)]">
            <div class="text-xs text-[var(--theme-text-muted)] mb-2">
              Tag Color
            </div>
            <GroupTagColorPicker
              value={group.tag_color ?? null}
              onchange={(color) => updateTagColor(group, color)}
            />
          </div>
        {/if}
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
  <div
    class="fixed inset-0 bg-[var(--theme-background)]/60 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div
      class="bg-[var(--theme-surface)] rounded-lg p-6 w-96 border border-[var(--theme-border)] shadow-lg"
    >
      <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-4">
        Create Widget Group
      </h3>

      <div class="space-y-4">
        <div>
          <label
            for="wgm-create-name"
            class="block text-sm font-medium text-[var(--theme-text)] mb-1"
          >
            Group Name
          </label>
          <input
            id="wgm-create-name"
            bind:value={newGroupName}
            type="text"
            placeholder="Enter group name"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
          />
        </div>

        <div>
          <label
            for="wgm-create-description"
            class="block text-sm font-medium text-[var(--theme-text)] mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="wgm-create-description"
            bind:value={newGroupDescription}
            placeholder="Enter group description"
            rows="3"
            class="w-full px-3 py-2 border border-[var(--theme-border)] rounded-md bg-[var(--theme-background)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
          ></textarea>
        </div>

        <div class="text-sm text-[var(--theme-text-muted)]">
          {$selectedWidgets.ids.length} widgets will be grouped together.
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          type="button"
          onclick={() => (showCreateDialog = false)}
          class="px-4 py-2 text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={createGroupFromSelection}
          class="px-4 py-2 bg-[var(--theme-success)] text-[var(--theme-background)] rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--theme-success)]"
        >
          Create Group
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Dialog -->
{#if confirmingDeleteId}
  <div
    class="fixed inset-0 bg-[var(--theme-background)]/60 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div
      class="bg-[var(--theme-surface)] rounded-lg p-6 w-80 border border-[var(--theme-border)] shadow-lg"
    >
      <h3 class="text-lg font-semibold text-[var(--theme-text)] mb-2">
        Ungroup Widgets?
      </h3>
      <p class="text-sm text-[var(--theme-text-muted)] mb-6">
        This group contains {$widgetGroups[confirmingDeleteId]?.widgets.length}
        widget{$widgetGroups[confirmingDeleteId]?.widgets.length === 1
          ? ""
          : "s"}. The widgets will remain on the canvas.
      </p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          onclick={cancelDelete}
          class="px-4 py-2 text-[var(--theme-text)] border border-[var(--theme-border)] rounded-md hover:bg-[var(--theme-background)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={confirmDelete}
          class="px-4 py-2 bg-[var(--theme-danger)] text-[var(--theme-background)] rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)]"
        >
          Ungroup
        </button>
      </div>
    </div>
  </div>
{/if}
