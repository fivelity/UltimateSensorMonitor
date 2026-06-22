<script lang="ts">
  import { selectedWidgets } from '$lib/stores';
  import WidgetInspector from './WidgetInspector.svelte';
  import VisualDimensionsPanel from './VisualDimensionsPanel.svelte';
  import WidgetGroupManager from './WidgetGroupManager.svelte';

  const { onclose }: { onclose?: () => void } = $props();

  let activeTab: 'inspector' | 'visual' | 'groups' = $state('inspector');

  // Auto-switch to inspector when widgets are selected
  $effect(() => {
    if ($selectedWidgets.ids.length > 0) {
      activeTab = 'inspector';
    }
  });
</script>

<div class="h-full flex flex-col bg-[var(--theme-surface)] border-l border-[var(--theme-border)]">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-[var(--theme-border)]">
    <h2 class="text-lg font-semibold text-[var(--theme-text)]">Properties</h2>
    <button
      onclick={() => onclose?.()}
      class="p-1 rounded hover:bg-[var(--theme-background)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
      title="Close Properties Panel"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Tab Navigation -->
  <div class="flex border-b border-[var(--theme-border)]">
    <button
      class="flex-1 px-3 py-2 text-xs font-medium transition-colors"
      class:active={activeTab === 'inspector'}
      class:inactive={activeTab !== 'inspector'}
      onclick={() => { activeTab = 'inspector'; }}
    >
      Inspector
    </button>
    <button
      class="flex-1 px-3 py-2 text-xs font-medium transition-colors"
      class:active={activeTab === 'visual'}
      class:inactive={activeTab !== 'visual'}
      onclick={() => { activeTab = 'visual'; }}
    >
      Visual
    </button>
    <button
      class="flex-1 px-3 py-2 text-xs font-medium transition-colors"
      class:active={activeTab === 'groups'}
      class:inactive={activeTab !== 'groups'}
      onclick={() => { activeTab = 'groups'; }}
    >
      Groups
    </button>
  </div>

  <!-- Tab Content -->
  <div class="flex-1 overflow-y-auto sidebar-content p-4">
    {#if activeTab === 'inspector'}
      <WidgetInspector />
    {:else if activeTab === 'visual'}
      <VisualDimensionsPanel />
    {:else if activeTab === 'groups'}
      <WidgetGroupManager />
    {/if}
  </div>
</div>

<style>
  .active {
    background-color: var(--theme-background);
    color: var(--theme-text);
    border-bottom: 2px solid var(--theme-primary, #3b82f6);
  }

  .inactive {
    background-color: transparent;
    color: var(--theme-text-muted);
  }

  .inactive:hover {
    background-color: var(--theme-background);
    color: var(--theme-text);
  }
</style>
