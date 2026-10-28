<script lang="ts">
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ReceiptText, Search } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const totalOutstanding = $derived(
    data.invoices
      .filter((invoice) => invoice.derivedStatus !== 'void')
      .reduce((sum, invoice) => sum + Math.max(0, Number(invoice.balance)), 0),
  );
</script>

<svelte:head><title>Tagihan · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Keuangan"
  title="Tagihan"
  subtitle="Pantau pembayaran, tunggakan, dan tagihan yang sudah lunas."
/>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" method="get">
  <div class="relative">
    <Search size={17} class="pointer-events-none absolute left-3 top-0 mt-3 text-muted" />
    <input
      class="input pl-9"
      name="search"
      value={data.filter.search}
      placeholder="Cari invoice, penghuni, kamar"
    />
  </div>
  <select class="select sm:w-36" name="status" value={data.filter.status}>
    <option value="all">Semua status</option>
    <option value="unpaid">Belum bayar</option>
    <option value="partial">Sebagian</option>
    <option value="paid">Lunas</option>
    <option value="overdue">Terlambat</option>
    <option value="void">Dibatalkan</option>
  </select>
  <input
    class="input sm:w-38"
    type="date"
    name="periodStart"
    value={data.filter.periodStart}
    aria-label="Periode mulai"
  />
  <input
    class="input sm:w-38"
    type="date"
    name="periodEnd"
    value={data.filter.periodEnd}
    aria-label="Periode akhir"
  />
  <button class="btn-secondary" type="submit">Filter</button>
</form>

<div
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white"
>
  <div class="flex items-center gap-2 text-sm font-medium">
    <ReceiptText size={17} class="text-lime" /> Total sisa tagihan
  </div>
  <p class="text-xl font-bold tabular-nums">{formatIdr(totalOutstanding.toFixed(2))}</p>
</div>

{#if data.invoices.length === 0}
  <div class="app-card">
    <EmptyState
      title="Tidak ada tagihan"
      description="Tagihan otomatis muncul saat kontrak aktif atau mendekati jatuh tempo."
    />
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Invoice</th><th>Penghuni</th><th>Periode</th><th>Jatuh tempo</th><th>Total</th><th
              >Sisa</th
            ><th>Status</th></tr
          ></thead
        >
        <tbody>
          {#each data.invoices as invoice (invoice.id)}
            <tr
              class="cursor-pointer"
              onclick={() => (window.location.href = `/invoices/${invoice.id}`)}
            >
              <td>
                <p class="font-semibold">{invoice.invoiceNumber}</p>
                <p class="text-xs text-muted">{invoice.propertyName} · {invoice.roomNumber}</p>
              </td>
              <td>{invoice.tenantName}</td>
              <td class="text-muted"
                >{formatIndonesianDate(invoice.periodStart)} – {formatIndonesianDate(
                  invoice.periodEnd,
                )}</td
              >
              <td>{formatIndonesianDate(invoice.dueDate)}</td>
              <td class="font-semibold tabular-nums">{formatIdr(invoice.totalAmount)}</td>
              <td class="tabular-nums">{formatIdr(invoice.balance)}</td>
              <td><StatusBadge status={invoice.derivedStatus} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.invoices as invoice (invoice.id)}
        <a class="block p-4" href="/invoices/{invoice.id}">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-bold">{invoice.invoiceNumber}</p>
              <p class="text-xs text-muted">{invoice.tenantName} · {invoice.roomNumber}</p>
            </div>
            <StatusBadge status={invoice.derivedStatus} />
          </div>
          <div class="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
            <p class="text-xs text-muted">
              Jatuh tempo<br /><span class="font-medium text-ink"
                >{formatIndonesianDate(invoice.dueDate)}</span
              >
            </p>
            <div class="text-right">
              <p class="text-sm font-bold tabular-nums">{formatIdr(invoice.totalAmount)}</p>
              {#if Number(invoice.balance) > 0 && invoice.derivedStatus !== 'void'}
                <p class="text-[11px] text-danger">Sisa {formatIdr(invoice.balance)}</p>
              {/if}
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
