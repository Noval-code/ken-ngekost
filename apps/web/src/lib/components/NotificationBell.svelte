<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { notificationStore } from '#lib/notifications.svelte.js';

  let { class: className = '' }: { class?: string } = $props();

  $effect(() => {
    notificationStore.refresh();
    const interval = setInterval(() => notificationStore.refresh(), 60_000);
    return () => clearInterval(interval);
  });
</script>

<a
  href="/notifications"
  class="relative inline-flex items-center justify-center {className}"
  aria-label="Notifikasi"
>
  <Bell size={20} strokeWidth={1.9} />
  {#if notificationStore.unreadCount > 0}
    <span
      class="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-sm"
    >
      {notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount}
    </span>
  {/if}
</a>
