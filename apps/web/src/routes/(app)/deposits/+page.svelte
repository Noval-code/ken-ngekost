<script lang="ts">
  import { formatIdr } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const heldTotal = $derived(
    data.deposits.reduce((sum, deposit) => sum + Number(deposit.heldAmount), 0),
  );
</script>

<svelte:head><title>Deposit · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Keuangan"
  title="Deposit"
  subtitle="Dana jaminan yang ditahan dan dikembalikan ke penghuni."
/>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[auto_1fr_auto]" method="get">
  <select class="select sm:w-48" name="status" value={data.filter.status}>
    <option value="all">Semua status</option>
    <option value="held">Ditahan</option>
    <option value="partially_refunded">Refund sebagian</option>
    <option value="refunded">Direfund</option>
  </select>
  <select class="select sm:w-56" name="propertyId" value={data.filter.propertyId}>
    <option value="">Semua properti</option>
    {#each data.properties as property (property.id)}<option value={property.id}
        >{property.name}</option
      >{/each}
  </select>
  <button class="btn-secondary" type="submit">Filter</button>
</form>

<div
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white"
>
  <span class="text-sm font-medium">Total deposit ditahan</span>
  <p class="text-xl font-bold tabular-nums">{formatIdr(heldTotal.toFixed(2))}</p>
</div>

{#if data.deposits.length === 0}
  <div class="app-card">
    <EmptyState
      title="Belum ada deposit"
      description="Deposit tercatat otomatis saat kontrak dengan nominal deposit dibuat."
    />
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Penghuni</th><th>Kamar</th><th>Diterima</th><th>Direfund</th><th>Ditahan</th><th
              >Status</th
            ></tr
          ></thead
        >
        <tbody>
          {#each data.deposits as deposit (deposit.id)}
            <tr
              class="cursor-pointer"
              onclick={() => (window.location.href = `/deposits/${deposit.id}`)}
            >
              <td class="font-semibold">{deposit.tenantName}</td>
              <td>{deposit.propertyName} · {deposit.roomNumber}</td>
              <td class="tabular-nums">{formatIdr(deposit.amountReceived)}</td>
              <td class="tabular-nums">{formatIdr(deposit.amountRefunded)}</td>
              <td class="font-semibold tabular-nums">{formatIdr(deposit.heldAmount)}</td>
              <td><StatusBadge status={deposit.status} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.deposits as deposit (deposit.id)}
        <a class="block p-4" href="/deposits/{deposit.id}">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-bold">{deposit.tenantName}</p>
              <p class="text-xs text-muted">{deposit.propertyName} · {deposit.roomNumber}</p>
            </div>
            <StatusBadge status={deposit.status} />
          </div>
          <div class="mt-3 flex items-end justify-between border-t border-line pt-3 text-xs">
            <span class="text-muted">Ditahan</span>
            <span class="text-sm font-bold tabular-nums">{formatIdr(deposit.heldAmount)}</span>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
