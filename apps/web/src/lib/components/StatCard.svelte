<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    value,
    detail,
    tone = 'default',
    icon,
  }: {
    label: string;
    value: string | number;
    detail?: string;
    tone?: 'default' | 'accent' | 'amber' | 'danger';
    icon?: Snippet;
  } = $props();

  const tones = {
    default: 'bg-paper text-muted',
    accent: 'bg-accent-soft text-accent',
    amber: 'bg-amber-soft text-amber',
    danger: 'bg-danger-soft text-danger',
  };
</script>

<div class="app-card card-pad">
  <div class="flex items-start justify-between gap-2">
    <p class="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
    {#if icon}
      <span class="flex size-8 items-center justify-center rounded-lg {tones[tone]}">
        {@render icon()}
      </span>
    {/if}
  </div>
  <p class="stat-value">{value}</p>
  {#if detail}<p class="mt-1 text-xs text-muted">{detail}</p>{/if}
</div>
