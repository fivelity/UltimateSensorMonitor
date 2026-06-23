<script lang="ts">
  import { selectedWidgets } from "$lib/stores";
  import { X } from "@lucide/svelte";
  import VisualDimensionsPanel from "./VisualDimensionsPanel.svelte";
  import WidgetGroupManager from "./WidgetGroupManager.svelte";
  import WidgetInspector from "./WidgetInspector.svelte";

  const { onclose }: { onclose?: () => void } = $props();

  let activeTab: "inspector" | "visual" | "groups" = $state("inspector");

  // Auto-switch to inspector when widgets are selected
  $effect(() => {
    if ($selectedWidgets.ids.length > 0) {
      activeTab = "inspector";
    }
  });

  const tabs = [
    { id: "inspector", label: "Inspector" },
    { id: "visual", label: "Visual" },
    { id: "groups", label: "Groups" },
  ] as const;
</script>

<div
  class="h-full flex flex-col bg-[var(--theme-surface)] border-l border-[var(--theme-border)]"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between p-4 border-b border-[var(--theme-border)]"
  >
    <h2 class="text-lg font-semibold text-[var(--theme-text)]">Properties</h2>
    <button
      onclick={() => onclose?.()}
      class="p-1 rounded hover:bg-[var(--theme-background)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)]"
      title="Close Properties Panel"
      aria-label="Close Properties Panel"
    >
      <X size={20} />
    </button>
  </div>

  <!-- Tab Navigation -->
  <div class="flex border-b border-[var(--theme-border)]">
    {#each tabs as tab}
      <button
        class="flex-1 px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary)]"
        class:bg-[var(--theme-background)]={activeTab === tab.id}
        class:text-[var(--theme-text)]={activeTab === tab.id}
        class:border-b-2={activeTab === tab.id}
        class:border-[var(--theme-primary)]={activeTab === tab.id}
        class:text-[var(--theme-text-muted)]={activeTab !== tab.id}
        class:hover:bg-[var(--theme-background)]={activeTab !== tab.id}
        class:hover:text-[var(--theme-text)]={activeTab !== tab.id}
        onclick={() => {
          activeTab = tab.id;
        }}
      >
        {tab.label}
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
      <WidgetGroupManager />
    {/if}
  </div>
</div>

<style>
  /* RightSidebar uses theme tokens only */
</style>
