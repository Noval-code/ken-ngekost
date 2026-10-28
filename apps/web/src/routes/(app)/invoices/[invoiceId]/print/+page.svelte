<script lang="ts">
  import { page } from '$app/state';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { ArrowLeft, Download, Printer } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const org = $derived(page.data.me.organization);

  const statusMap: Record<string, { label: string; class: string }> = {
    paid: { label: 'LUNAS', class: 'border-green-600 text-green-700 bg-green-50' },
    partial: { label: 'DIBAYAR SEBAGIAN', class: 'border-amber-600 text-amber-700 bg-amber-50' },
    overdue: { label: 'TERLAMBAT', class: 'border-red-600 text-red-700 bg-red-50' },
    unpaid: { label: 'BELUM LUNAS', class: 'border-amber-600 text-amber-700 bg-amber-50' },
    void: { label: 'DIBATALKAN', class: 'border-gray-400 text-gray-500 bg-gray-50' },
  };

  const currentStatus = $derived(
    statusMap[data.invoice.derivedStatus] ?? {
      label: data.invoice.derivedStatus.toUpperCase(),
      class: 'border-gray-400 text-gray-700 bg-gray-50',
    },
  );

  $effect(() => {
    if (page.url.searchParams.get('autoprint') === 'true') {
      setTimeout(() => window.print(), 300);
    }
  });
</script>

<svelte:head>
  <title>Faktur #{data.invoice.invoiceNumber} · {org.name}</title>
</svelte:head>

<!-- Top bar actions (hidden during print) -->
<div class="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/invoices/{data.invoice.id}"
  >
    <ArrowLeft size={14} /> Kembali ke tagihan
  </a>
  <div class="flex items-center gap-2">
    <a
      class="btn-secondary btn-sm"
      href="/api/invoices/{data.invoice.id}/pdf?download=true"
      download="Invoice-{data.invoice.invoiceNumber}.pdf"
    >
      <Download size={15} /> Unduh PDF
    </a>
    <button class="btn-primary btn-sm" onclick={() => window.print()}>
      <Printer size={15} /> Cetak Dokumen
    </button>
  </div>
</div>

<!-- Printable Paper Container -->
<div
  class="mx-auto max-w-[800px] rounded-2xl border border-line bg-white p-8 shadow-sm sm:p-12 print:max-w-none print:border-none print:p-0 print:shadow-none"
>
  <!-- Letterhead -->
  <div class="flex items-start justify-between border-b border-line pb-6">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-accent">{org.name}</h1>
      {#if org.address}
        <p class="mt-1 max-w-sm text-xs text-muted">{org.address}</p>
      {/if}
      <div class="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
        {#if org.phone}<span>Telp: {org.phone}</span>{/if}
        {#if org.email}<span>Email: {org.email}</span>{/if}
      </div>
    </div>
    <div class="text-right">
      <p class="text-xl font-bold uppercase tracking-tight text-ink">FAKTUR TAGIHAN</p>
      <p class="mt-0.5 text-sm font-bold text-accent">#{data.invoice.invoiceNumber}</p>
      <div class="mt-2 text-xs text-muted space-y-0.5">
        <p>Tgl Terbit: <span class="font-medium text-ink">{formatIndonesianDate(data.invoice.createdAt.slice(0, 10))}</span></p>
        <p>Jatuh Tempo: <span class="font-bold text-ink">{formatIndonesianDate(data.invoice.dueDate)}</span></p>
      </div>
    </div>
  </div>

  <!-- Info Grid: Bill To & Room Info -->
  <div class="mt-6 grid grid-cols-2 gap-4">
    <div class="rounded-xl border border-line/80 bg-paper/60 p-4">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted">DITAGIHKAN KEPADA:</p>
      <p class="mt-1 text-base font-bold text-ink">{data.invoice.tenantName}</p>
      <p class="text-xs text-muted">No. HP: {data.invoice.tenantPhone || '—'}</p>
      <p class="mt-2 text-xs text-ink font-medium">
        Periode Sewa:<br />
        <span class="text-muted">{formatIndonesianDate(data.invoice.periodStart)} s/d {formatIndonesianDate(data.invoice.periodEnd)}</span>
      </p>
    </div>

    <div class="rounded-xl border border-line/80 bg-paper/60 p-4 flex flex-col justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-muted">UNIT / KAMAR:</p>
        <p class="mt-1 text-base font-bold text-ink">{data.invoice.propertyName}</p>
        <p class="text-xs text-muted">Nomor Kamar: <span class="font-bold text-ink">{data.invoice.roomNumber}</span></p>
      </div>
      <div class="mt-3">
        <span class="inline-block rounded-md border px-2.5 py-1 text-[11px] font-bold tracking-wider {currentStatus.class}">
          {currentStatus.label}
        </span>
      </div>
    </div>
  </div>

  <!-- Invoice Items Table -->
  <div class="mt-8 overflow-hidden rounded-xl border border-line">
    <table class="w-full text-left text-sm border-collapse">
      <thead>
        <tr class="bg-accent-soft/60 text-[11px] font-bold uppercase tracking-wider text-accent-dark">
          <th class="px-4 py-3 text-center w-12">No</th>
          <th class="px-4 py-3">Deskripsi Tagihan</th>
          <th class="px-4 py-3 text-right">Jumlah</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line/70">
        {#each data.invoice.items as item, index (item.id)}
          <tr class={index % 2 === 1 ? 'bg-paper/30' : ''}>
            <td class="px-4 py-3 text-center text-xs text-muted">{index + 1}</td>
            <td class="px-4 py-3">
              <p class="font-medium text-ink">{item.description}</p>
              {#if item.itemType}
                <p class="text-[10px] uppercase text-muted tracking-wide">{item.itemType}</p>
              {/if}
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatIdr(item.amount)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Summary Breakdown -->
  <div class="mt-6 flex justify-end">
    <div class="w-full sm:w-72 space-y-2 text-sm">
      <div class="flex justify-between text-muted">
        <span>Subtotal</span>
        <span class="font-medium tabular-nums text-ink">{formatIdr(data.invoice.subtotal)}</span>
      </div>
      {#if Number(data.invoice.discountAmount) > 0}
        <div class="flex justify-between text-muted">
          <span>Diskon</span>
          <span class="font-medium tabular-nums text-danger">−{formatIdr(data.invoice.discountAmount)}</span>
        </div>
      {/if}
      <div class="flex justify-between border-t border-line pt-2 text-base font-bold text-accent">
        <span>Total Tagihan</span>
        <span class="tabular-nums">{formatIdr(data.invoice.totalAmount)}</span>
      </div>
      <div class="flex justify-between text-xs text-green-700">
        <span>Sudah Dibayar</span>
        <span class="font-semibold tabular-nums">{formatIdr(data.invoice.paidAmount)}</span>
      </div>
      <div class="flex justify-between border-t border-dashed border-line pt-2 text-sm font-bold {Number(data.invoice.balance) > 0 ? 'text-danger' : 'text-muted'}">
        <span>Sisa Tagihan</span>
        <span class="tabular-nums">{formatIdr(data.invoice.balance)}</span>
      </div>
    </div>
  </div>

  <!-- Payment Allocations (if any) -->
  {#if data.invoice.allocations && data.invoice.allocations.length > 0}
    <div class="mt-8 border-t border-line pt-5">
      <h3 class="text-xs font-bold uppercase tracking-wider text-muted">Riwayat Pembayaran</h3>
      <div class="mt-2 divide-y divide-line/60 rounded-xl border border-line bg-paper/30 text-xs">
        {#each data.invoice.allocations as alloc (alloc.id)}
          <div class="flex items-center justify-between px-3 py-2">
            <div>
              <span class="font-semibold text-ink">{alloc.paymentNumber}</span>
              <span class="text-muted"> · {formatIndonesianDate(alloc.paidAt)} · {alloc.method === 'cash' ? 'Tunai' : 'Transfer Bank'}</span>
              {#if alloc.reference}<span class="text-muted"> ({alloc.reference})</span>{/if}
            </div>
            <span class="font-bold tabular-nums text-green-700">{formatIdr(alloc.amount)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Notes & Signatures -->
  <div class="mt-10 border-t border-line pt-6 grid grid-cols-2 gap-8 text-xs">
    <div>
      <p class="font-bold text-muted uppercase tracking-wider text-[10px]">Catatan / Instruksi Pembayaran:</p>
      <p class="mt-1 text-muted leading-relaxed">
        {data.invoice.notes || 'Pembayaran dapat dilakukan melalui transfer bank atau tunai kepada pengelola. Harap lakukan konfirmasi setelah melakukan pembayaran.'}
      </p>
    </div>
    <div class="text-center flex flex-col items-center justify-between h-28">
      <p class="text-muted">Pengelola Kost,</p>
      <div>
        <p class="font-bold text-ink underline">{org.name}</p>
        <p class="text-[10px] text-muted mt-0.5">Tanda Tangan & Cap</p>
      </div>
    </div>
  </div>

  <!-- Bottom Footer Watermark -->
  <div class="mt-10 border-t border-line/60 pt-4 flex justify-between text-[10px] text-muted">
    <span>Dokumen ini diterbitkan secara resmi melalui Panggora Kost Management.</span>
    <span>Dicetak: {formatIndonesianDate(new Date().toISOString().slice(0, 10))}</span>
  </div>
</div>
