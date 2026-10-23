<script lang="ts">
  import { formatIdr, formatIndonesianDate, statusLabel } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { Banknote, Plus, Search } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const totalReceived = $derived(
    data.payments
      .filter((payment) => payment.status === 'received')
      .reduce((sum, payment) => sum + Number(payment.amount), 0),
  );
</script>

<svelte:head><title>Pembayaran · Ken Ngekost</title></svelte:head>

<PageHeader
  eyebrow="Keuangan"
  title="Pembayaran"
  subtitle="Catat dan telusuri pembayaran yang diterima."
>
  {#snippet actions()}
    <a class="btn-primary btn-sm" href="/payments/new"><Plus size={16} /> Catat bayar</a>
  {/snippet}
</PageHeader>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" method="get">
  <div class="relative">
    <Search size={17} class="pointer-events-none absolute left-3 top-0 mt-3 text-muted" />
    <input
      class="input pl-9"
      name="search"
      value={data.filter.search}
      placeholder="Cari nomor pembayaran atau referensi"
    />
  </div>
  <select class="select sm:w-36" name="method" value={data.filter.method}>
    <option value="all">Semua metode</option>
    <option value="cash">Tunai</option>
    <option value="bank_transfer">Transfer</option>
  </select>
  <select class="select sm:w-32" name="status" value={data.filter.status}>
    <option value="received">Diterima</option>
    <option value="void">Dibatalkan</option>
    <option value="all">Semua</option>
  </select>
  <input
    class="input sm:w-38"
    type="date"
    name="from"
    value={data.filter.from}
    aria-label="Dari tanggal"
  />
  <input
    class="input sm:w-38"
    type="date"
    name="to"
    value={data.filter.to}
    aria-label="Sampai tanggal"
  />
  <button class="btn-secondary" type="submit">Filter</button>
</form>

<div
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white"
>
  <div class="flex items-center gap-2 text-sm font-medium">
    <Banknote size={17} class="text-lime" /> Total ditampilkan
  </div>
  <p class="text-xl font-bold tabular-nums">{formatIdr(totalReceived.toFixed(2))}</p>
</div>

{#if data.payments.length === 0}
  <div class="app-card">
    <EmptyState
      title="Belum ada pembayaran"
      description="Pembayaran yang dicatat akan muncul di sini."
    >
      {#snippet action()}<a class="btn-primary btn-sm" href="/payments/new"
          ><Plus size={16} /> Catat pembayaran</a
        >{/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Pembayaran</th><th>Penghuni</th><th>Invoice</th><th>Tanggal</th><th>Metode</th><th
              >Nominal</th
            ><th>Status</th></tr
          ></thead
        >
        <tbody>
          {#each data.payments as payment (payment.id)}
            <tr
              class="cursor-pointer"
              onclick={() => (window.location.href = `/payments/${payment.id}`)}
            >
              <td class="font-semibold">{payment.paymentNumber}</td>
              <td>{payment.tenantNames || '—'}</td>
              <td class="text-muted">{payment.invoiceNumbers || '—'}</td>
              <td>{formatIndonesianDate(payment.paidAt)}</td>
              <td class="text-muted">{statusLabel(payment.method)}</td>
              <td class="font-semibold tabular-nums">{formatIdr(payment.amount)}</td>
              <td><StatusBadge status={payment.status} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.payments as payment (payment.id)}
        <a class="block p-4" href="/payments/{payment.id}">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-bold">{payment.paymentNumber}</p>
              <p class="text-xs text-muted">{payment.tenantNames || 'Tanpa penghuni'}</p>
            </div>
            <StatusBadge status={payment.status} />
          </div>
          <div class="mt-3 flex items-end justify-between border-t border-line pt-3 text-xs">
            <span class="text-muted"
              >{formatIndonesianDate(payment.paidAt)} · {statusLabel(payment.method)}</span
            >
            <span class="text-sm font-bold tabular-nums">{formatIdr(payment.amount)}</span>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
