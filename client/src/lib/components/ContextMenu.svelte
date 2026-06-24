<script lang="ts">
  import {
    alignWidgets,
    distributeWidgets,
    editMode,
    selectedWidgets,
    uiUtils,
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
    RemoveWidgetCommand,
  } from "$lib/stores/history";
  import type {
    ContextMenuState,
    Selection,
    WidgetConfig,
    WidgetGroup,
  } from "$lib/types";
  import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalDistributeCenter,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalDistributeCenter,
    ArrowDown,
    ArrowUp,
    Copy,
    LayoutGrid,
    Lock,
    MousePointerClick,
    Search,
    Sparkles,
    Trash2,
    Unlock,
    X,
  } from "@lucide/svelte";
  import { get } from "svelte/store";

  type IconComponent = typeof MousePointerClick;

  interface Props {
    x: number;
    y: number;
    target?: ContextMenuState["target"];
    onfindInSidebar?: (_sensorId: string) => void;
    onopenWizard?: () => void;
  }

  type MenuActionItem = {
    label: string;
    action: string;
    icon?: IconComponent;
    danger?: boolean;
  };
  type MenuDivider = { type: "divider" };
  type MenuItem = MenuActionItem | MenuDivider;

  function isDivider(item: MenuItem): item is MenuDivider {
    return "type" in item && item.type === "divider";
  }

  function asAction(item: MenuItem): MenuActionItem {
    return item as MenuActionItem;
  }

  const {
    x,
    y,
    target = undefined,
    onfindInSidebar,
    onopenWizard,
  }: Props = $props();

  let menuElement = $state<HTMLElement | undefined>(undefined);

  // Adjust position if menu would go off screen
  const adjustedX = $derived(Math.min(x, window.innerWidth - 200));
  const adjustedY = $derived(Math.min(y, window.innerHeight - 300));

  const menuItems = $derived(
    getMenuItems(target, $selectedWidgets, $widgets, $editMode),
  );

  function handleAction(action: string) {
    const selectedWidgetsState = get(selectedWidgets);
    const widgetsMap = get(widgets);
    const widgetGroupsMap = get(widgetGroups);

    switch (action) {
      case "select":
        if (target?.type === "widget" && target.id) {
          uiUtils.selectWidget(target.id);
        }
        break;

      case "find-in-sidebar":
        if (target?.type === "widget" && target.id) {
          const widget = widgetsMap[target.id];
          if (widget?.sensor_id) {
            // Notify parent to handle sidebar navigation
            onfindInSidebar?.(widget.sensor_id);
          }
        }
        break;

      case "lock":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          selectedWidgetsState.ids.forEach((id: string) => {
            widgetUtils.updateWidget(id, { is_locked: true });
          });
        }
        break;

      case "unlock":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          selectedWidgetsState.ids.forEach((id: string) => {
            widgetUtils.updateWidget(id, { is_locked: false });
          });
        }
        break;

      case "delete":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          const removeCommands = selectedWidgetsState.ids
            .map((id: string) => widgetsMap[id])
            .filter((w: WidgetConfig | undefined): w is WidgetConfig =>
              Boolean(w),
            )
            .map(
              (w: WidgetConfig) =>
                new RemoveWidgetCommand(
                  w,
                  widgetUtils.addWidget,
                  widgetUtils.removeWidget,
                ),
            );
          if (removeCommands.length > 0) {
            historyStore.executeCommand(
              new BatchCommand(
                removeCommands,
                `Delete ${removeCommands.length} widget${removeCommands.length === 1 ? "" : "s"}`,
              ),
            );
          }
          uiUtils.clearSelection();
        }
        break;

      case "duplicate":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          const addCommands: AddWidgetCommand[] = [];
          selectedWidgetsState.ids.forEach((id: string) => {
            const widget = widgetsMap[id];
            if (widget) {
              const newWidget = {
                ...widget,
                id: `widget_${Date.now()}_${Math.random()
                  .toString(36)
                  .substring(2, 9)}`,
                pos_x: widget.pos_x + 20,
                pos_y: widget.pos_y + 20,
              };
              addCommands.push(
                new AddWidgetCommand(
                  newWidget,
                  widgetUtils.addWidget,
                  widgetUtils.removeWidget,
                ),
              );
            }
          });
          if (addCommands.length > 0) {
            historyStore.executeCommand(
              new BatchCommand(
                addCommands,
                `Duplicate ${addCommands.length} widget${addCommands.length === 1 ? "" : "s"}`,
              ),
            );
          }
        }
        break;

      case "bring-to-front":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          const maxZ =
            Math.max(
              ...Object.values(widgetsMap).map((w: WidgetConfig) => w.z_index),
            ) + 1;
          selectedWidgetsState.ids.forEach((id: string) => {
            widgetUtils.updateWidget(id, { z_index: maxZ });
          });
        }
        break;

      case "send-to-back":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          const minZ =
            Math.min(
              ...Object.values(widgetsMap).map((w: WidgetConfig) => w.z_index),
            ) - 1;
          selectedWidgetsState.ids.forEach((id: string) => {
            widgetUtils.updateWidget(id, { z_index: minZ });
          });
        }
        break;

      case "group":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 1
        ) {
          const firstWidget = widgetsMap[selectedWidgetsState.ids[0]];
          const relativePositions: Record<string, { x: number; y: number }> =
            {};

          selectedWidgetsState.ids.forEach((id: string) => {
            const widget = widgetsMap[id];
            if (widget) {
              relativePositions[id] = {
                x: widget.pos_x - firstWidget.pos_x,
                y: widget.pos_y - firstWidget.pos_y,
              };
            }
          });

          const newGroup = {
            id: crypto.randomUUID(),
            name: `Group ${Object.keys(widgetGroupsMap).length + 1}`,
            description: `Group of ${selectedWidgetsState.ids.length} widgets`,
            widgets: selectedWidgetsState.ids,
            relative_positions: relativePositions,
            created_at: new Date().toISOString(),
          };

          historyStore.executeCommand(
            new GroupWidgetsCommand(
              newGroup,
              selectedWidgetsState.ids,
              widgetUtils.addGroup,
              widgetUtils.removeGroup,
              widgetUtils.updateWidget,
            ),
          );
        }
        break;

      case "ungroup":
        if (
          selectedWidgetsState.type === "widget" &&
          selectedWidgetsState.ids.length > 0
        ) {
          const groupsToRemove = new Set<string>();

          selectedWidgetsState.ids.forEach((widgetId: string) => {
            const widget = widgetsMap[widgetId];
            if (widget?.group_id) {
              groupsToRemove.add(widget.group_id);
            }
          });

          const deleteCommands = Array.from(groupsToRemove)
            .map((groupId) => widgetGroupsMap[groupId])
            .filter((group): group is WidgetGroup => Boolean(group))
            .map(
              (group) =>
                new DeleteGroupCommand(
                  group,
                  group.widgets,
                  widgetUtils.removeGroup,
                  widgetUtils.addGroup,
                  widgetUtils.updateWidget,
                ),
            );

          if (deleteCommands.length > 0) {
            historyStore.executeCommand(
              new BatchCommand(
                deleteCommands,
                `Ungroup ${deleteCommands.length} group${deleteCommands.length === 1 ? "" : "s"}`,
              ),
            );
          }
        }
        break;

      case "clear-selection":
        uiUtils.clearSelection();
        break;

      case "open-wizard":
        onopenWizard?.();
        break;

      case "align-left":
        alignWidgets("align-left");
        break;
      case "align-right":
        alignWidgets("align-right");
        break;
      case "align-top":
        alignWidgets("align-top");
        break;
      case "align-bottom":
        alignWidgets("align-bottom");
        break;
      case "align-center-horizontal":
        alignWidgets("align-center-horizontal");
        break;
      case "align-center-vertical":
        alignWidgets("align-center-vertical");
        break;
      case "distribute-horizontal":
        distributeWidgets("distribute-horizontal");
        break;
      case "distribute-vertical":
        distributeWidgets("distribute-vertical");
        break;
    }

    // Close menu after action
    uiUtils.hideContextMenu();
  }

  // Get context-specific menu items
  function getMenuItems(
    target: ContextMenuState["target"],
    selectedWidgetsState: Selection,
    widgetsMap: Record<string, WidgetConfig>,
    editMode: string,
  ): MenuItem[] {
    const items: MenuItem[] = [];

    if (editMode !== "edit") {
      return []; // No context menu in view mode
    }

    if (target?.type === "widget" && target.id) {
      const widget = widgetsMap[target.id];
      const isSelected =
        selectedWidgetsState.type === "widget" &&
        selectedWidgetsState.ids.includes(target.id);
      const selectedCount =
        selectedWidgetsState.type === "widget"
          ? selectedWidgetsState.ids.length
          : 0;

      if (!isSelected) {
        items.push({
          label: "Select",
          action: "select",
          icon: MousePointerClick,
        });
        items.push({ type: "divider" });
      }

      if (selectedCount > 0) {
        // Add Find in Sidebar option for single widget selection
        if (selectedCount === 1 && widget?.sensor_id) {
          items.push({
            label: "Find in Sidebar",
            action: "find-in-sidebar",
            icon: Search,
          });
          items.push({ type: "divider" });
        }

        items.push({
          label: "Duplicate",
          action: "duplicate",
          icon: Copy,
        });
        items.push({
          label: "Delete",
          action: "delete",
          icon: Trash2,
          danger: true,
        });
        items.push({ type: "divider" });

        // Lock/Unlock
        const hasLocked = selectedWidgetsState.ids.some(
          (id: string) => widgetsMap[id]?.is_locked,
        );
        const hasUnlocked = selectedWidgetsState.ids.some(
          (id: string) => !widgetsMap[id]?.is_locked,
        );

        if (hasUnlocked) {
          items.push({ label: "Lock", action: "lock", icon: Lock });
        }
        if (hasLocked) {
          items.push({ label: "Unlock", action: "unlock", icon: Unlock });
        }

        items.push({ type: "divider" });
        items.push({
          label: "Bring to Front",
          action: "bring-to-front",
          icon: ArrowUp,
        });
        items.push({
          label: "Send to Back",
          action: "send-to-back",
          icon: ArrowDown,
        });

        if (selectedCount > 1) {
          items.push({ type: "divider" });
          items.push({
            label: "Align Left",
            action: "align-left",
            icon: AlignStartHorizontal,
          });
          items.push({
            label: "Align Right",
            action: "align-right",
            icon: AlignEndHorizontal,
          });
          items.push({
            label: "Align Top",
            action: "align-top",
            icon: AlignStartVertical,
          });
          items.push({
            label: "Align Bottom",
            action: "align-bottom",
            icon: AlignEndVertical,
          });
          items.push({
            label: "Align Center Horizontal",
            action: "align-center-horizontal",
            icon: AlignCenterHorizontal,
          });
          items.push({
            label: "Align Center Vertical",
            action: "align-center-vertical",
            icon: AlignCenterVertical,
          });

          if (selectedCount >= 3) {
            items.push({ type: "divider" });
            items.push({
              label: "Distribute Horizontal",
              action: "distribute-horizontal",
              icon: AlignHorizontalDistributeCenter,
            });
            items.push({
              label: "Distribute Vertical",
              action: "distribute-vertical",
              icon: AlignVerticalDistributeCenter,
            });
          }

          items.push({ type: "divider" });
          items.push({
            label: "Group",
            action: "group",
            icon: LayoutGrid,
          });
        }
      }
    } else if (target?.type === "canvas") {
      // Canvas context menu
      const selectedCount =
        selectedWidgetsState.type === "widget"
          ? selectedWidgetsState.ids.length
          : 0;

      items.push({
        label: "Add Widget Wizard",
        action: "open-wizard",
        icon: Sparkles,
      });

      if (selectedCount > 0) {
        items.push({ type: "divider" });
        items.push({
          label: "Clear Selection",
          action: "clear-selection",
          icon: X,
        });
      }
    }

    return items;
  }
</script>

<!-- Menu positioned absolutely -->
<div
  bind:this={menuElement}
  class="context-menu fixed z-50 bg-[var(--theme-surface-glass)] backdrop-blur-[var(--theme-backdrop-blur)] border border-[var(--theme-border)] rounded-lg shadow-lg py-1 min-w-48"
  style="left: {adjustedX}px; top: {adjustedY}px;"
  role="menu"
  tabindex="-1"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.stopPropagation()}
>
  {#each menuItems as item}
    {#if isDivider(item)}
      <div class="h-px bg-[var(--theme-border)] my-1"></div>
    {:else}
      {@const action = asAction(item)}
      {@const IconComponent = action.icon}
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-background)] transition-colors flex items-center gap-2 focus:outline-none focus:bg-[var(--theme-background)]"
        class:text-[var(--theme-danger)]={action.danger}
        class:text-[var(--theme-text)]={!action.danger}
        onclick={() => handleAction(action.action)}
      >
        {#if IconComponent}
          <IconComponent size={16} class="opacity-70" />
        {/if}
        {action.label}
      </button>
    {/if}
  {/each}

  {#if menuItems.length === 0}
    <div class="px-3 py-2 text-sm text-[var(--theme-text-muted)]">
      No actions available
    </div>
  {/if}
</div>

<style>
  .context-menu {
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, var(--theme-elevation-opacity)),
      0 2px 4px -1px rgba(0, 0, 0, var(--theme-elevation-opacity));
  }
</style>
