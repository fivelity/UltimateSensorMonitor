<script lang="ts">
  import { inspectorStore, selectedWidgets, widgetGroups } from "$lib/stores";
  import type { Bounds } from "$lib/types";
  import { X } from "@lucide/svelte";
  import VisualDimensionsPanel from "./VisualDimensionsPanel.svelte";
  import WidgetGroupManager from "./WidgetGroupManager.svelte";
  import WidgetInspector from "./WidgetInspector.svelte";

  const {
    onclose,
    onlocateGroup,
  }: { onclose?: () => void; onlocateGroup?: (_bounds: Bounds) => void } =
    $props();

  const tabs = [
    { id: "inspector", label: "Inspector" },
    { id: "visual", label: "Visual" },
    { id: "groups", label: "Groups" },
  ] as const;

  type TabId = (typeof tabs)[number]["id"];

  let activeTab: TabId = $state($inspectorStore.activeTab);
  let previousSelectionCount = $state(0);
  let sidebarElement = $state<HTMLElement | undefined>(undefined);
  let isResizing = $state(false);

  // Persist tab changes to inspector store
  $effect(() => {
    if (activeTab !== $inspectorStore.activeTab) {
      inspectorStore.setActiveTab(activeTab);
    }
  });

  // Sync store changes (e.g., from another component) to local state
  $effect(() => {
    if ($inspectorStore.activeTab !== activeTab) {
      activeTab = $inspectorStore.activeTab;
    }
  });

  // Auto-switch to inspector only when selection changes from empty to non-empty
  $effect(() => {
    const currentCount = $selectedWidgets.ids.length;
    const wasEmpty = previousSelectionCount === 0;
    const isNonEmpty = currentCount > 0;

    if (wasEmpty && isNonEmpty) {
      activeTab = "inspector";
    }

    previousSelectionCount = currentCount;
  });

  const inspectorBadge = $derived(
    $selectedWidgets.type === "widget" && $selectedWidgets.ids.length > 0
      ? $selectedWidgets.ids.length
      : null,
  );

  const groupsBadge = $derived(
    Object.keys($widgetGroups).length > 0
      ? Object.keys($widgetGroups).length
      : null,
  );

  function getTabBadge(tabId: TabId): number | null {
    if (tabId === "inspector") return inspectorBadge;
    if (tabId === "groups") return groupsBadge;
    return null;
  }

  function handleTabClick(tabId: TabId) {
    activeTab = tabId;
  }

  function handleResizePointerDown(event: PointerEvent) {
    event.preventDefault();
    isResizing = true;
    window.addEventListener("pointermove", handleResizePointerMove);
    window.addEventListener("pointerup", handleResizePointerUp);
  }

  function handleResizePointerMove(event: PointerEvent) {
    if (!isResizing || !sidebarElement) return;
    const rightEdge = sidebarElement.getBoundingClientRect().right;
    const newWidth = Math.max(280, Math.min(480, rightEdge - event.clientX));
    inspectorStore.setRightSidebarWidth(newWidth);
  }

  function handleResizePointerUp() {
    isResizing = false;
    window.removeEventListener("pointermove", handleResizePointerMove);
    window.removeEventListener("pointerup", handleResizePointerUp);
  }
</script>

<div
  bind:this={sidebarElement}
  class="glass-panel h-full flex flex-col rounded-l-2xl border-l border-y border-[var(--glass-border)] relative"
>
  <!-- Resize handle -->
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize properties panel"
    class="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[var(--theme-primary)]/20 active:bg-[var(--theme-primary)]/40 z-10"
    onpointerdown={handleResizePointerDown}
  ></div>

  <!-- Header -->
  <div
    class="flex items-center justify-between p-4 border-b border-[var(--glass-border)]"
  >
    <h2 class="text-lg font-semibold text-[var(--theme-text)]">Properties</h2>
    <button
      type="button"
      onclick={() => onclose?.()}
      class="p-1.5 rounded-lg hover:bg-white/10 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      title="Close Properties Panel"
      aria-label="Close Properties Panel"
    >
      <X size={20} />
    </button>
  </div>

  <!-- Tab Navigation -->
  <div class="flex border-b border-[var(--glass-border)]">
    {#each tabs as tab}
      {@const badge = getTabBadge(tab.id)}
      <button
        type="button"
        class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary)] flex items-center justify-center gap-1.5"
        class:text-[var(--theme-text)]={activeTab === tab.id}
        class:border-b-2={activeTab === tab.id}
        class:border-[var(--theme-primary)]={activeTab === tab.id}
        class:text-[var(--theme-text-muted)]={activeTab !== tab.id}
        class:hover-glass={activeTab !== tab.id}
        class:hover:text-[var(--theme-text)]={activeTab !== tab.id}
        onclick={() => handleTabClick(tab.id)}
      >
        {tab.label}
        {#if badge !== null}
          <span
            class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]"
          >
            {badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="flex-1 overflow-y-auto sidebar-content p-4">
    {#if activeTab === "inspector"}
      <WidgetInspector />
    {:else if activeTab === "visual"}
      <VisualDimensionsPanel />
    {:else if activeTab === "groups"}
      <WidgetGroupManager {onlocateGroup} />
    {/if}
  </div>
</div>

<style>
  /* RightSidebar uses theme tokens only */
  .hover-glass:hover {
    background: rgba(255, 255, 255, 0.05);
  }
</style>
