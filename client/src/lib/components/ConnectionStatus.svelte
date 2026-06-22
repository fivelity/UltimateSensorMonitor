<script lang="ts">
  import { connectionStatus } from '$lib/stores';

  const statusConfig = {
    disconnected: {
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      text: 'Disconnected',
      icon: 'offline'
    },
    connecting: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      text: 'Connecting...',
      icon: 'loading'
    },
    connected: {
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      text: 'Connected',
      icon: 'online'
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      text: 'Connection Error',
      icon: 'error'
    }
  };

  const config = $derived(statusConfig[$connectionStatus]);

  function getIcon(iconType: string) {
    const icons: Record<string, string> = {
      online: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
      offline: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L12 21l-2.3-2.3m7.464-7.464L12 9l-2.3-2.3M5.636 5.636L12 12',
      loading: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      error: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'
    };
    return icons[iconType] || icons.offline;
  }
</script>

{#if $connectionStatus !== 'connected'}
  <div
    class="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-lg border shadow-lg {config.bgColor} {config.borderColor} backdrop-blur-sm transition-all duration-300"
  >
    <div class="flex items-center gap-2 text-sm font-medium {config.color}">
      <svg
        class="w-4 h-4 {config.icon === 'loading' ? 'animate-spin' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d={getIcon(config.icon)}
        />
      </svg>
      <span>{config.text}</span>
    </div>
  </div>
{/if}
