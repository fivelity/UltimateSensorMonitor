<script lang="ts">
  interface Props {
    value?: string | null;
    onchange?: (color: string | null) => void;
  }

  const { value = null, onchange }: Props = $props();

  const tagColors = [
    { id: "primary", css: "var(--theme-primary)" },
    { id: "secondary", css: "var(--theme-secondary)" },
    { id: "accent", css: "var(--theme-accent)" },
    { id: "danger", css: "var(--theme-danger)" },
    { id: "success", css: "var(--theme-success)" },
    { id: "warning", css: "var(--theme-warning)" },
    { id: "text-muted", css: "var(--theme-text-muted)" },
  ];

  function handleSelect(color: string | null) {
    onchange?.(color);
  }
</script>

<div class="flex items-center gap-2 flex-wrap">
  {#each tagColors as color}
    <button
      type="button"
      onclick={() => handleSelect(color.css)}
      class="w-6 h-6 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:ring-[var(--theme-primary)]"
      class:border-[var(--theme-border)]={value !== color.css}
      class:border-[var(--theme-text)]={value === color.css}
      class:scale-110={value === color.css}
      style="background: {color.css};"
      title="Tag color {color.id}"
      aria-label="Select tag color {color.id}"
    ></button>
  {/each}
  <button
    type="button"
    onclick={() => handleSelect(null)}
    class="w-6 h-6 rounded-full border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text-muted)] text-xs flex items-center justify-center hover:text-[var(--theme-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:ring-[var(--theme-primary)]"
    title="No tag color"
    aria-label="Clear tag color"
  >
    ×
  </button>
</div>
