<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    value,
    detail,
    tone = 'default',
    compact = false,
    icon,
  }: {
    label: string;
    value: string | number;
    detail?: string;
    tone?: 'default' | 'accent' | 'amber' | 'danger';
    /** Tighter padding and type, for previews and dense layouts. */
    compact?: boolean;
    icon?: Snippet;
  } = $props();

  const tones = {
    default: 'bg-paper text-muted',
    accent: 'bg-accent-soft text-accent',
    amber: 'bg-amber-soft text-amber',
    danger: 'bg-danger-soft text-danger',
  };

  // Full-size is used by the dashboard; compact fits previews and dense grids.
  const variants = {
    full: {
      root: 'app-card card-pad',
      label: 'text-xs font-semibold uppercase tracking-wider text-muted',
      icon: 'size-8',
      value: 'stat-value',
      detail: 'mt-1 text-xs text-muted',
    },
    compact: {
      root: 'app-card p-3',
      label: 'text-[10px] font-semibold uppercase leading-4 tracking-wider text-muted',
      icon: 'size-7',
      value: 'mt-1 text-base font-bold tracking-tight tabular-nums sm:text-lg',
      detail: 'mt-0.5 text-[10px] leading-4 text-muted',
    },
  };

  const v = $derived(compact ? variants.compact : variants.full);
</script>

<div class={v.root}>
  <div class="flex items-start justify-between gap-2">
    <p class={v.label}>{label}</p>
    {#if icon}
      <span class="flex {v.icon} items-center justify-center rounded-lg {tones[tone]}">
        {@render icon()}
      </span>
    {/if}
  </div>
  <p class={v.value}>{value}</p>
  {#if detail}<p class={v.detail}>{detail}</p>{/if}
</div>
