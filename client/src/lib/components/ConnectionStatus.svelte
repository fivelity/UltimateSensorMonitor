<script lang="ts">
  import { connectionStatus } from "$lib/stores";
  import { AlertCircle, Radio, RefreshCw, WifiOff } from "@lucide/svelte";

  const statusConfig = {
    disconnected: {
      text: "Disconnected",
      icon: WifiOff,
      color: "text-[var(--theme-danger)]",
      bg: "bg-[var(--theme-surface)]",
      border: "border-[var(--theme-danger)]",
    },
    connecting: {
      text: "Connecting...",
      icon: RefreshCw,
      color: "text-[var(--theme-warning)]",
      bg: "bg-[var(--theme-surface)]",
      border: "border-[var(--theme-warning)]",
    },
    connected: {
      text: "Connected",
      icon: Radio,
      color: "text-[var(--theme-success)]",
      bg: "bg-[var(--theme-surface)]",
      border: "border-[var(--theme-success)]",
    },
    error: {
      text: "Connection Error",
      icon: AlertCircle,
      color: "text-[var(--theme-danger)]",
      bg: "bg-[var(--theme-surface)]",
      border: "border-[var(--theme-danger)]",
    },
  };

  const config = $derived(statusConfig[$connectionStatus]);
  const Icon = $derived(config.icon);
</script>

{#if $connectionStatus !== "connected"}
  <div
    class="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-lg border shadow-lg backdrop-blur-[var(--theme-backdrop-blur)] transition-all duration-300 {config.bg} {config.border}"
  >
    <div class="flex items-center gap-2 text-sm font-medium {config.color}">
      <Icon
        size={16}
        class={$connectionStatus === "connecting" ? "animate-spin" : ""}
      />
      <span>{config.text}</span>
    </div>
  </div>
{/if}
