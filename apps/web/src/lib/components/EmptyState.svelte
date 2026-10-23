<script lang="ts">
  import { Inbox } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let {
    title = 'Belum ada data',
    description = 'Data akan muncul di sini setelah ditambahkan.',
    action,
  }: { title?: string; description?: string; action?: Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
  <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-paper text-muted">
    <Inbox size={22} />
  </div>
  <h3 class="font-semibold">{title}</h3>
  <p class="mt-1 max-w-sm text-sm text-muted">{description}</p>
  {#if action}<div class="mt-4">{@render action()}</div>{/if}
</div>
