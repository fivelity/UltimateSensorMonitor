<script lang="ts">
  /**
   * FloatingToolbar — a glassmorphic pill-shaped toolbar anchored to the
   * bottom-center of the canvas. Hosts the redesigned interaction tool set
   * (select / move / pan / add-widget), grid-snap magnitude slider, sidebar
   * toggles, and undo/redo shortcuts.
   */

  import {
    activeTool,
    showLeftSidebar,
    showRightSidebar,
    TOOL_DEFINITIONS,
    TOOL_ORDER,
    uiUtils,
    visualSettings,
    visualUtils,
    type ToolId,
  } from "$lib/stores";
  import { historyStore } from "$lib/stores/history";
  import {
    Hand,
    Magnet,
    MousePointer2,
    Move,
    PanelLeft,
    PanelRight,
    Plus,
    Redo2,
    Undo2,
  } from "@lucide/svelte";
  import type { Component } from "svelte";

  const TOOL_ICONS: Record<ToolId, Component> = {
    select: MousePointer2,
    move: Move,
    pan: Hand,
    add: Plus,
  };

  const TOOL_LABELS: Record<ToolId, string> = {
    select: "Select",
    move: "Move",
    pan: "Pan",
    add: "Add Widget",
  };

  // History state
  const canUndo = $derived($historyStore.currentIndex >= 0);
  const canRedo = $derived(
    $historyStore.currentIndex < $historyStore.commands.length - 1,
  );

  // Snap state
  const snapEnabled = $derived($visualSettings.snap_to_grid);
  const gridSize = $derived($visualSettings.grid_size);
  const showGrid = $derived($visualSettings.show_grid);

  function selectTool(tool: ToolId): void {
    activeTool.setTool(tool);
  }

  function handleToolKeydown(event: KeyboardEvent): void {
    if (activeTool.handleShortcut(event)) {
      event.preventDefault();
    }
  }

  function toggleSnap(): void {
    visualUtils.toggleSnap();
  }

  function toggleGrid(): void {
    visualUtils.toggleGrid();
  }

  function handleGridSizeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number.parseInt(target.value, 10);
    if (!Number.isNaN(value)) {
      visualUtils.setGridSize(value);
    }
  }

  function toggleLeftSidebar(): void {
    uiUtils.toggleLeftSidebar();
  }

  function toggleRightSidebar(): void {
    uiUtils.toggleRightSidebar();
  }

  function handleUndo(): void {
    historyStore.undo();
  }

  function handleRedo(): void {
    historyStore.redo();
  }
</script>

<svelte:window onkeydown={handleToolKeydown} />

<div
  class="floating-pill fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl px-2 py-1.5 select-none"
  role="toolbar"
  aria-label="Workspace tools"
>
  <!-- Tool group -->
  <div class="flex items-center gap-1">
    {#each TOOL_ORDER as toolId (toolId)}
      {@const Icon = TOOL_ICONS[toolId]}
      {@const isActive = $activeTool === toolId}
      {@const def = TOOL_DEFINITIONS[toolId]}
      <button
        type="button"
        class="tool-button group relative flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
        class:bg-[var(--theme-primary)]={isActive}
        class:text-[var(--theme-background)]={isActive}
        class:shadow-[0_0_18px_rgba(var(--theme-primary-rgb),0.55)]={isActive}
        class:text-[var(--theme-text-muted)]={!isActive}
        class:hover:text-[var(--theme-text)]={!isActive}
        class:hover-glass={!isActive}
        onclick={() => selectTool(toolId)}
        aria-pressed={isActive}
        aria-label="{TOOL_LABELS[toolId]} tool ({def.shortcut.toUpperCase()})"
        title="{TOOL_LABELS[toolId]} ({def.shortcut.toUpperCase()})"
      >
        <Icon size={18} />
        {#if isActive}
          <span class="text-xs font-medium pr-0.5">{TOOL_LABELS[toolId]}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="mx-1 h-7 w-px bg-white/10"></div>

  <!-- Snap + grid magnitude slider -->
  <div class="flex items-center gap-1.5 px-1">
    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
      class:bg-[var(--theme-primary)]={snapEnabled}
      class:text-[var(--theme-background)]={snapEnabled}
      class:text-[var(--theme-text-muted)]={!snapEnabled}
      class:hover:text-[var(--theme-text)]={!snapEnabled}
      class:hover-glass={!snapEnabled}
      onclick={toggleSnap}
      aria-pressed={snapEnabled}
      aria-label="Toggle grid snap"
      title="Toggle grid snap"
    >
      <Magnet size={16} />
    </button>

    <label class="flex items-center gap-1.5 px-1" title="Grid step size (px)">
      <input
        type="range"
        min="2"
        max="50"
        step="1"
        value={gridSize}
        oninput={handleGridSizeChange}
        class="grid-slider h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--theme-primary)]"
        aria-label="Grid step size"
      />
      <span
        class="min-w-[2ch] text-center text-[10px] font-mono text-[var(--theme-text-muted)]"
      >
        {gridSize}
      </span>
    </label>

    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
      class:bg-glass-strong={showGrid}
      class:text-[var(--theme-text)]={showGrid}
      class:text-[var(--theme-text-muted)]={!showGrid}
      class:hover:text-[var(--theme-text)]={!showGrid}
      class:hover-glass={!showGrid}
      onclick={toggleGrid}
      aria-pressed={showGrid}
      aria-label="Toggle grid overlay"
      title="Toggle grid overlay"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>
  </div>

  <div class="mx-1 h-7 w-px bg-white/10"></div>

  <!-- Undo / Redo -->
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
      class:text-[var(--theme-text-muted)]={canUndo}
      class:hover:text-[var(--theme-text)]={canUndo}
      class:hover-glass={canUndo}
      onclick={handleUndo}
      disabled={!canUndo}
      aria-label="Undo (Ctrl+Z)"
      title="Undo (Ctrl+Z)"
    >
      <Undo2 size={16} />
    </button>
    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
      class:text-[var(--theme-text-muted)]={canRedo}
      class:hover:text-[var(--theme-text)]={canRedo}
      class:hover-glass={canRedo}
      onclick={handleRedo}
      disabled={!canRedo}
      aria-label="Redo (Ctrl+Shift+Z)"
      title="Redo (Ctrl+Shift+Z)"
    >
      <Redo2 size={16} />
    </button>
  </div>

  <div class="mx-1 h-7 w-px bg-white/10"></div>

  <!-- Sidebar toggles -->
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
      class:bg-[var(--theme-primary)]={$showLeftSidebar}
      class:text-[var(--theme-background)]={$showLeftSidebar}
      class:text-[var(--theme-text-muted)]={!$showLeftSidebar}
      class:hover:text-[var(--theme-text)]={!$showLeftSidebar}
      class:hover-glass={!$showLeftSidebar}
      onclick={toggleLeftSidebar}
      aria-pressed={$showLeftSidebar}
      aria-label="Toggle sensor panel"
      title="Toggle sensor panel"
    >
      <PanelLeft size={16} />
    </button>
    <button
      type="button"
      class="tool-button flex items-center justify-center rounded-xl p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
      class:bg-[var(--theme-primary)]={$showRightSidebar}
      class:text-[var(--theme-background)]={$showRightSidebar}
      class:text-[var(--theme-text-muted)]={!$showRightSidebar}
      class:hover:text-[var(--theme-text)]={!$showRightSidebar}
      class:hover-glass={!$showRightSidebar}
      onclick={toggleRightSidebar}
      aria-pressed={$showRightSidebar}
      aria-label="Toggle inspector panel"
      title="Toggle inspector panel"
    >
      <PanelRight size={16} />
    </button>
  </div>
</div>

<style>
  .tool-button {
    color: var(--theme-text-muted);
  }

  .tool-button.hover-glass:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .tool-button.bg-glass-strong {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Range slider thumb styling for the grid magnitude control */
  .grid-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--theme-primary);
    box-shadow: 0 0 8px rgba(var(--theme-primary-rgb), 0.6);
    cursor: pointer;
  }

  .grid-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: none;
    border-radius: 50%;
    background: var(--theme-primary);
    box-shadow: 0 0 8px rgba(var(--theme-primary-rgb), 0.6);
    cursor: pointer;
  }
</style>
