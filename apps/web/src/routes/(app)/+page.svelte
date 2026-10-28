<script lang="ts">
  import { formatIdr, formatIndonesianDate, statusLabel } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatCard from '#lib/components/StatCard.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import {
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    CalendarDays,
    CircleDollarSign,
    DoorOpen,
    Plus,
    ReceiptText,
    Wallet,
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const stats = $derived(data.dashboard.totals);
  const properties = $derived(data.properties);
  const pct = $derived(
    stats.invoicesIssued && Number(stats.invoicesIssued) > 0
      ? Math.round((Number(stats.cashReceipts) / Number(stats.invoicesIssued)) * 100)
      : 0,
  );
  const hasFilters = $derived(
    Boolean(data.filter.from || data.filter.to || data.filter.propertyId),
  );
</script>

<svelte:head><title>Beranda · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Ringkasan operasional"
  title="Beranda"
  subtitle="Prioritas hari ini: kamar kosong, tagihan jatuh tempo, dan pembayaran terbaru."
>
  {#snippet actions()}
    <a class="btn-secondary btn-sm" href="/reports"><CalendarDays size={16} /> Laporan</a>
    <a class="btn-primary btn-sm" href="/payments/new"><Plus size={16} /> Catat bayar</a>
  {/snippet}
</PageHeader>

<form class="app-card mb-5 flex flex-wrap items-end gap-3 p-4" method="get">
  <div class="field min-w-36 flex-1">
    <label class="label" for="from">Dari</label>
    <input id="from" class="input" type="date" name="from" value={data.filter.from} />
  </div>
  <div class="field min-w-36 flex-1">
    <label class="label" for="to">Sampai</label>
    <input id="to" class="input" type="date" name="to" value={data.filter.to} />
  </div>
  <div class="field min-w-40 flex-1">
    <label class="label" for="propertyId">Properti</label>
    <select id="propertyId" class="select" name="propertyId" value={data.filter.propertyId}>
      <option value="">Semua properti</option>
      {#each properties as property (property.id)}
        <option value={property.id}>{property.name}</option>
      {/each}
    </select>
  </div>
  <button class="btn-secondary" type="submit">Terapkan</button>
  {#if hasFilters}<a class="btn-ghost" href="/">Reset</a>{/if}
</form>

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
  <StatCard
    label="Tingkat hunian"
    value="{stats.occupancyRate}%"
    detail="{stats.occupiedRooms} terisi · {stats.vacantRooms} kosong"
    tone="accent"
  >
    {#snippet icon()}<DoorOpen size={16} />{/snippet}
  </StatCard>
  <StatCard
    label="Kas diterima"
    value={formatIdr(stats.cashReceipts)}
    detail="Periode {formatIndonesianDate(data.dashboard.period.from)}–{formatIndonesianDate(
      data.dashboard.period.to,
    )}"
    tone="accent"
  >
    {#snippet icon()}<Wallet size={16} />{/snippet}
  </StatCard>
  <StatCard
    label="Sisa tagihan"
    value={formatIdr(stats.outstandingAll)}
    detail="Seluruh invoice berjalan"
    tone="amber"
  >
    {#snippet icon()}<ReceiptText size={16} />{/snippet}
  </StatCard>
  <StatCard
    label="Tunggakan"
    value={formatIdr(stats.overdueAll)}
    detail="Lewat jatuh tempo"
    tone="danger"
  >
    {#snippet icon()}<CircleDollarSign size={16} />{/snippet}
  </StatCard>
</div>

<div class="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
  <section class="app-card card-pad">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="section-title">Arus kas periode</h2>
        <p class="mt-1 text-xs text-muted">
          Uang diterima dibandingkan pengeluaran — bukan nilai invoice.
        </p>
      </div>
      <span class="badge-green">{pct}% tertagih</span>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-paper p-3.5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Kas masuk</p>
        <p class="mt-1 text-lg font-bold tabular-nums text-accent">
          {formatIdr(stats.cashReceipts)}
        </p>
      </div>
      <div class="rounded-xl bg-paper p-3.5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Pengeluaran</p>
        <p class="mt-1 text-lg font-bold tabular-nums text-danger">{formatIdr(stats.expenses)}</p>
      </div>
      <div class="rounded-xl bg-accent-soft p-3.5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-accent-dark">
          Kas bersih
        </p>
        <p class="mt-1 text-lg font-bold tabular-nums text-accent-dark">
          {formatIdr(stats.netCash)}
        </p>
      </div>
    </div>

    <div class="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted">Invoice diterbitkan</span>
        <span class="font-semibold tabular-nums">{formatIdr(stats.invoicesIssued)}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted">Piutang periode</span>
        <span class="font-semibold tabular-nums">{formatIdr(stats.outstanding)}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted">Deposit diterima</span>
        <span class="font-semibold tabular-nums">{formatIdr(stats.depositReceived)}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-muted">Deposit direfund</span>
        <span class="font-semibold tabular-nums">{formatIdr(stats.depositRefunded)}</span>
      </div>
    </div>
  </section>

  <section class="app-card">
    <div class="flex items-center justify-between border-b border-line px-4 py-3.5">
      <h2 class="section-title">Jatuh tempo</h2>
      <a class="text-xs font-semibold text-accent" href="/invoices?status=overdue">Lihat semua</a>
    </div>
    {#if data.dashboard.dueInvoices.length === 0}
      <EmptyState
        title="Tidak ada tunggakan"
        description="Semua tagihan jatuh tempo sudah beres."
      />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.dashboard.dueInvoices as invoice (invoice.id)}
          <li>
            <a
              class="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
              href="/invoices/{invoice.id}"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{invoice.tenantName}</p>
                <p class="mt-0.5 text-xs text-muted">
                  {invoice.propertyName} · {invoice.roomNumber} · jatuh {formatIndonesianDate(
                    invoice.dueDate,
                  )}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold tabular-nums text-danger">
                  {formatIdr(invoice.balance)}
                </p>
                <p class="text-[11px] text-muted">{invoice.invoiceNumber}</p>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<div class="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
  <section class="app-card">
    <div class="flex items-center justify-between border-b border-line px-4 py-3.5">
      <h2 class="section-title">Ringkasan properti</h2>
      <a class="text-xs font-semibold text-accent" href="/properties">Kelola</a>
    </div>
    {#if data.dashboard.properties.length === 0}
      <EmptyState
        title="Belum ada properti"
        description="Tambahkan properti dan kamar untuk mulai mencatat operasional."
      >
        {#snippet action()}<a class="btn-primary btn-sm" href="/properties">Tambah properti</a
          >{/snippet}
      </EmptyState>
    {:else}
      <div class="grid gap-3 p-4 sm:grid-cols-2">
        {#each data.dashboard.properties as property (property.propertyId)}
          <a
            class="rounded-xl border border-line p-3.5 transition-colors hover:bg-paper/60"
            href="/properties/{property.propertyId}"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="flex items-center gap-1.5 truncate text-sm font-semibold">
                  <Building2 size={15} class="shrink-0 text-accent" />
                  {property.propertyName}
                </p>
                <p class="mt-1 text-xs text-muted">
                  {property.occupiedRooms}/{property.totalRooms} kamar terisi
                </p>
              </div>
              <span class="badge-green">{property.occupancyRate}%</span>
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span class="text-muted">Kas diterima</span>
              <span class="font-semibold tabular-nums">{formatIdr(property.cashReceipts)}</span>
            </div>
            <div class="mt-1.5 flex items-center justify-between text-xs">
              <span class="text-muted">Tunggakan</span>
              <span class="font-semibold tabular-nums text-danger"
                >{formatIdr(property.overdue)}</span
              >
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="app-card">
    <div class="flex items-center justify-between border-b border-line px-4 py-3.5">
      <h2 class="section-title">Pembayaran terbaru</h2>
      <a class="text-xs font-semibold text-accent" href="/payments">Lihat semua</a>
    </div>
    {#if data.dashboard.recentPayments.length === 0}
      <EmptyState
        title="Belum ada pembayaran"
        description="Pembayaran yang dicatat akan muncul di sini."
      />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.dashboard.recentPayments as payment (payment.id)}
          <li>
            <a
              class="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
              href="/payments/{payment.id}"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                >
                  <ArrowDownRight size={16} />
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">
                    {payment.tenantNames || 'Pembayaran'}
                  </p>
                  <p class="text-xs text-muted">
                    {formatIndonesianDate(payment.paidAt)} · {statusLabel(payment.method)}
                  </p>
                </div>
              </div>
              <span class="text-sm font-bold tabular-nums text-accent"
                >+{formatIdr(payment.amount)}</span
              >
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<p class="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted">
  <ArrowUpRight size={13} class="mt-0.5 shrink-0" />
  Kas diterima menghitung uang yang benar-benar masuk. Invoice diterbitkan adalah nilai tagihan. Sisa
  tagihan adalah piutang, dan deposit tidak dihitung sebagai pendapatan sewa.
</p>
