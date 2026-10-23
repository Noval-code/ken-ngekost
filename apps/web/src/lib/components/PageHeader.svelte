<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    subtitle,
    eyebrow,
    actions,
  }: {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: Snippet;
  } = $props();
</script>

<header class="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
  <div class="min-w-0">
    {#if eyebrow}
      <p class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
    {/if}
    <h1 class="page-title">{title}</h1>
    {#if subtitle}<p class="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>{/if}
  </div>
  {#if actions}
    <div class="flex w-full items-center gap-2 sm:w-auto">
      {@render actions()}
    </div>
  {/if}
</header>
