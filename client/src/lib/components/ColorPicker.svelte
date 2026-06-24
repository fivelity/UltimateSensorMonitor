<script lang="ts">
  interface Props {
    value?: string;
    onchange?: (value: string) => void;
    id?: string;
    placeholder?: string;
  }

  const {
    value = "",
    onchange,
    id = undefined,
    placeholder = "var(--theme-primary)",
  }: Props = $props();

  const colorPresets = [
    { id: "primary", label: "Primary", value: "var(--theme-primary)" },
    { id: "secondary", label: "Secondary", value: "var(--theme-secondary)" },
    { id: "accent", label: "Accent", value: "var(--theme-accent)" },
    { id: "danger", label: "Danger", value: "var(--theme-danger)" },
    { id: "success", label: "Success", value: "var(--theme-success)" },
    { id: "warning", label: "Warning", value: "var(--theme-warning)" },
  ];

  const colorInputValue = $derived(
    value?.startsWith("#") ? value : "#000000",
  );

  function handleTextChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onchange?.(target.value);
  }

  function handleColorInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onchange?.(target.value);
  }

  function selectPreset(presetValue: string) {
    onchange?.(presetValue);
  }

  const isHex = $derived(Boolean(value?.startsWith("#")));
</script>

<div class="flex items-center gap-2">
  <input
    {id}
    type="text"
    {value}
    {placeholder}
    class="flex-1 px-2 py-1 text-sm bg-[var(--theme-background)] border border-[var(--theme-border)] rounded text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:outline-none"
    onchange={handleTextChange}
  />

  <div class="flex items-center gap-1">
    {#each colorPresets as preset}
      <button
        type="button"
        onclick={() => selectPreset(preset.value)}
        class="w-6 h-6 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:ring-[var(--theme-primary)]"
        class:border-[var(--theme-border)]={value !== preset.value}
        class:border-[var(--theme-text)]={value === preset.value}
        class:scale-110={value === preset.value}
        style="background: {preset.value};"
        title={preset.label}
        aria-label="Use {preset.label} color"
      ></button>
    {/each}

    {#if isHex}
      <input
        type="color"
        value={colorInputValue}
        class="w-8 h-8 rounded border border-[var(--theme-border)] bg-transparent cursor-pointer"
        onchange={handleColorInputChange}
        aria-label="Custom color"
      />
    {/if}
  </div>
</div>
