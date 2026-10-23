<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  let {
    page,
    totalPages,
    total,
    onchange,
  }: {
    page: number;
    totalPages: number;
    total: number;
    onchange: (page: number) => void;
  } = $props();
</script>

{#if totalPages > 1}
  <div class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
    <p class="text-xs text-muted">
      Halaman {page} dari {totalPages} · {total} data
    </p>
    <div class="flex gap-1">
      <button
        class="icon-btn size-9"
        aria-label="Halaman sebelumnya"
        disabled={page <= 1}
        onclick={() => onchange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        class="icon-btn size-9"
        aria-label="Halaman berikutnya"
        disabled={page >= totalPages}
        onclick={() => onchange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
{/if}
