<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let {
    open = false,
    title,
    description,
    onclose,
    children,
    footer,
    size = 'md',
  }: {
    open?: boolean;
    title: string;
    description?: string;
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
    <button
      class="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      aria-label="Tutup dialog"
      onclick={onclose}
    ></button>
    <div
      class="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl {size ===
      'sm'
        ? 'sm:max-w-md'
        : size === 'lg'
          ? 'sm:max-w-2xl'
          : 'sm:max-w-xl'}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 id="modal-title" class="text-lg font-bold">{title}</h2>
          {#if description}<p class="mt-1 text-sm text-muted">{description}</p>{/if}
        </div>
        <button class="icon-btn -mr-2 -mt-1" aria-label="Tutup" onclick={onclose}>
          <X size={20} />
        </button>
      </div>
      <div class="overflow-y-auto px-5 py-5">
        {@render children()}
      </div>
      {#if footer}
        <div class="safe-bottom border-t border-line px-5 py-3 sm:pb-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
