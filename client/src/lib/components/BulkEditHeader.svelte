<script lang="ts">
  import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    Lock,
    Trash2,
    Unlock,
  } from "@lucide/svelte";

  interface Props {
    count: number;
    onlock?: () => void;
    onunlock?: () => void;
    ondelete?: () => void;
    onalign?: (action: "horizontal" | "vertical") => void;
    ondistribute?: (action: "horizontal" | "vertical") => void;
  }

  const {
    count,
    onlock,
    onunlock,
    ondelete,
    onalign,
    ondistribute,
  }: Props = $props();
</script>

<div class="p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] space-y-3">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-[var(--theme-text)]">
      {count} widget{count === 1 ? "" : "s"} selected
    </span>
    <span class="text-xs text-[var(--theme-text-muted)]">Bulk edit</span>
  </div>

  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      onclick={() => onlock?.()}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
      title="Lock all selected"
    >
      <Lock size={12} />
      Lock
    </button>
    <button
      type="button"
      onclick={() => onunlock?.()}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
      title="Unlock all selected"
    >
      <Unlock size={12} />
      Unlock
    </button>
    <button
      type="button"
      onclick={() => ondelete?.()}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-danger)] text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-danger)] flex items-center gap-1"
      title="Delete all selected"
    >
      <Trash2 size={12} />
      Delete
    </button>
  </div>

  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      onclick={() => onalign?.("horizontal")}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
      title="Align horizontally"
    >
      <AlignCenterHorizontal size={12} />
      Align H
    </button>
    <button
      type="button"
      onclick={() => onalign?.("vertical")}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] flex items-center gap-1"
      title="Align vertically"
    >
      <AlignCenterVertical size={12} />
      Align V
    </button>
    <button
      type="button"
      onclick={() => ondistribute?.("horizontal")}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      title="Distribute horizontally"
    >
      Distribute H
    </button>
    <button
      type="button"
      onclick={() => ondistribute?.("vertical")}
      class="px-2 py-1 text-xs rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      title="Distribute vertically"
    >
      Distribute V
    </button>
  </div>
</div>
