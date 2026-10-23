<script lang="ts">
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import { Download, TrendingDown, TrendingUp, Wallet } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const exportUrl = $derived(
    `/api/reports/export.csv?from=${data.filter.from}&to=${data.filter.to}${data.filter.propertyId ? `&propertyId=${data.filter.propertyId}` : ''}`,
  );
</script>

<svelte:head><title>Laporan · Ken Ngekost</title></svelte:head>

<PageHeader
  eyebrow="Analisis"
  title="Laporan"
  subtitle="Arus kas, piutang, tunggakan, dan kinerja hunian."
>
  {#snippet actions()}
    <a class="btn-secondary btn-sm" href={exportUrl} download><Download size={15} /> CSV</a>
  {/snippet}
</PageHeader>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[auto_auto_1fr_auto]" method="get">
  <input
    class="input sm:w-40"
    type="date"
    name="from"
    value={data.filter.from}
    required
    aria-label="Dari tanggal"
  />
  <input
    class="input sm:w-40"
    type="date"
    name="to"
    value={data.filter.to}
    required
    aria-label="Sampai tanggal"
  />
  <select class="select" name="propertyId" value={data.filter.propertyId}>
    <option value="">Semua properti</option>
    {#each data.properties as property (property.id)}<option value={property.id}
        >{property.name}</option
      >{/each}
  </select>
  <button class="btn-primary" type="submit">Tampilkan</button>
</form>

<p class="mb-3 text-xs text-muted">
  Periode {formatIndonesianDate(data.report.period.from)} – {formatIndonesianDate(
    data.report.period.to,
  )}
</p>

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
  <div class="app-card p-4">
    <div class="flex items-center justify-between">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Penerimaan kas</p>
      <TrendingUp size={16} class="text-accent" />
    </div>
    <p class="mt-2 text-xl font-bold tabular-nums">{formatIdr(data.report.totals.cashReceipts)}</p>
  </div>
  <div class="app-card p-4">
    <div class="flex items-center justify-between">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Pengeluaran</p>
      <TrendingDown size={16} class="text-danger" />
    </div>
    <p class="mt-2 text-xl font-bold tabular-nums">{formatIdr(data.report.totals.expenses)}</p>
  </div>
  <div class="app-card p-4">
    <div class="flex items-center justify-between">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Kas bersih</p>
      <Wallet size={16} class="text-muted" />
    </div>
    <p class="mt-2 text-xl font-bold tabular-nums">{formatIdr(data.report.totals.netCash)}</p>
  </div>
  <div class="app-card p-4">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Tingkat hunian</p>
    <p class="mt-2 text-xl font-bold tabular-nums">{data.report.totals.occupancyRate}%</p>
    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
      <div
        class="h-full rounded-full bg-accent"
        style="width: {data.report.totals.occupancyRate}%"
      ></div>
    </div>
  </div>
</div>

<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <div class="app-card p-3">
    <p class="text-xs text-muted">Invoice diterbitkan</p>
    <p class="mt-1 font-bold tabular-nums">{formatIdr(data.report.totals.invoicesIssued)}</p>
    <p class="text-[11px] text-muted">{data.report.totals.invoicesCount} invoice</p>
  </div>
  <div class="app-card p-3">
    <p class="text-xs text-muted">Piutang</p>
    <p class="mt-1 font-bold tabular-nums text-amber">
      {formatIdr(data.report.totals.outstanding)}
    </p>
  </div>
  <div class="app-card p-3">
    <p class="text-xs text-muted">Tunggakan</p>
    <p class="mt-1 font-bold tabular-nums text-danger">{formatIdr(data.report.totals.overdue)}</p>
  </div>
  <div class="app-card p-3">
    <p class="text-xs text-muted">Deposit bersih</p>
    <p class="mt-1 font-bold tabular-nums">
      {formatIdr(
        (
          Number(data.report.totals.depositReceived) - Number(data.report.totals.depositRefunded)
        ).toFixed(2),
      )}
    </p>
  </div>
</div>

<section class="app-card mt-4 overflow-hidden">
  <div class="border-b border-line px-4 py-3.5"><h2 class="section-title">Per properti</h2></div>
  <div class="table-wrap">
    <table class="data-table">
      <thead
        ><tr
          ><th>Properti</th><th>Hunian</th><th>Kas</th><th>Pengeluaran</th><th>Piutang</th><th
            >Tunggakan</th
          ><th>Kas bersih</th></tr
        ></thead
      >
      <tbody>
        {#each data.report.properties as row (row.propertyId)}
          <tr>
            <td class="font-semibold">{row.propertyName}</td>
            <td
              >{row.occupiedRooms}/{row.totalRooms}
              <span class="text-xs text-muted">({row.occupancyRate}%)</span></td
            >
            <td class="tabular-nums">{formatIdr(row.cashReceipts)}</td>
            <td class="tabular-nums">{formatIdr(row.expenses)}</td>
            <td class="tabular-nums text-amber">{formatIdr(row.outstanding)}</td>
            <td class="tabular-nums text-danger">{formatIdr(row.overdue)}</td>
            <td class="font-semibold tabular-nums">{formatIdr(row.netCash)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<p class="mt-3 text-[11px] leading-5 text-muted">
  Kas = pembayaran diterima pada periode. Invoice = tagihan diterbitkan pada periode. Piutang dan
  tunggakan dihitung dari seluruh invoice aktif hingga akhir periode, bukan hanya yang diterbitkan
  dalam periode.
</p>
