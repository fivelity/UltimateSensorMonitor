<script lang="ts">
  import { Search, X } from "@lucide/svelte";

  interface Props {
    value?: string;
    placeholder?: string;
    onchange?: (value: string) => void;
    onclear?: () => void;
    className?: string;
    autofocus?: boolean;
  }

  const {
    value = "",
    placeholder = "Search...",
    onchange,
    onclear,
    className = "",
    autofocus = false,
  }: Props = $props();

  let inputElement: HTMLInputElement | undefined = $state();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    onchange?.(target.value);
  }

  function handleClear() {
    onchange?.("");
    onclear?.();
    inputElement?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClear();
    }
  }
</script>

<div class="relative flex items-center {className}">
  <Search
    size={16}
    class="absolute left-3 text-[var(--theme-text-muted)] pointer-events-none"
  />
  <input
    bind:this={inputElement}
    type="text"
    {value}
    {placeholder}
    {autofocus}
    oninput={handleInput}
    onkeydown={handleKeydown}
    class="w-full pl-9 pr-8 py-2 bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-md text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-colors"
  />
  {#if value}
    <button
      type="button"
      onclick={handleClear}
      class="absolute right-2 p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      title="Clear search"
      aria-label="Clear search"
    >
      <X size={14} />
    </button>
  {/if}
</div>
