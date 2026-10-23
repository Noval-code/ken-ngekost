<script lang="ts">
  import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';
  import { toasts } from '#lib/toast.svelte.js';

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
</script>

<div
  class="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 sm:left-auto sm:right-5 sm:top-5 sm:items-end"
>
  {#each toasts.items as toast (toast.id)}
    {@const Icon = icons[toast.kind]}
    <div
      class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg {toast.kind ===
      'success'
        ? 'border-accent/20 bg-accent-soft text-accent-dark'
        : toast.kind === 'error'
          ? 'border-danger/20 bg-danger-soft text-danger'
          : 'border-line bg-surface text-ink'}"
      role="status"
    >
      <Icon size={18} class="mt-0.5 shrink-0" />
      <span class="flex-1">{toast.message}</span>
      <button
        class="icon-btn -m-2 size-8 shrink-0"
        aria-label="Tutup notifikasi"
        onclick={() => toasts.dismiss(toast.id)}
      >
        <X size={15} />
      </button>
    </div>
  {/each}
</div>
