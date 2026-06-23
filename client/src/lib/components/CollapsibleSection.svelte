<script lang="ts">
  import { ChevronDown, ChevronRight } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    sectionId: string;
    expanded?: boolean;
    ontoggle?: (sectionId: string) => void;
    badge?: string | number | null;
    children?: Snippet;
  }

  const {
    title,
    sectionId,
    expanded = false,
    ontoggle,
    badge = null,
    children,
  }: Props = $props();

  const ChevronIcon = $derived(expanded ? ChevronDown : ChevronRight);
</script>

<div class="border border-[var(--theme-border)] rounded-lg overflow-hidden bg-[var(--theme-surface)]">
  <button
    type="button"
    onclick={() => ontoggle?.(sectionId)}
    class="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-[var(--theme-background)] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary)]"
    aria-expanded={expanded}
  >
    <ChevronIcon size={16} class="text-[var(--theme-text-muted)]" />
    <span class="text-sm font-medium text-[var(--theme-text)] flex-1">{title}</span>
    {#if badge !== null && badge !== undefined}
      <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
        {badge}
      </span>
    {/if}
  </button>

  {#if expanded}
    <div class="px-3 pb-3 border-t border-[var(--theme-border)]">
      {@render children?.()}
    </div>
  {/if}
</div>
