<script lang="ts">
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import {
    ArrowLeft,
    Banknote,
    Download,
    FileText,
    LoaderCircle,
    Printer,
    XCircle,
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let voidOpen = $state(false);
  let saving = $state(false);
  let reason = $state('');

  const canVoid = $derived(
    data.invoice.status === 'issued' &&
      Number(data.invoice.paidAmount) === 0 &&
      (page.data.me.membership.role === 'owner' || page.data.me.membership.role === 'admin'),
  );

  async function voidInvoice(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/invoices/${data.invoice.id}/void`, {
        method: 'POST',
        body: { reason },
      });
      toasts.success('Tagihan dibatalkan.');
      voidOpen = false;
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal membatalkan tagihan.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{data.invoice.invoiceNumber} · Panggora</title></svelte:head>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/invoices"
  >
    <ArrowLeft size={14} /> Kembali ke tagihan
  </a>
  <div class="flex flex-wrap items-center gap-2">
    <a
      class="btn-secondary btn-sm"
      href="/api/invoices/{data.invoice.id}/pdf"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FileText size={15} /> Lihat PDF
    </a>
    <a
      class="btn-secondary btn-sm"
      href="/api/invoices/{data.invoice.id}/pdf?download=true"
      download="Invoice-{data.invoice.invoiceNumber}.pdf"
    >
      <Download size={15} /> Unduh PDF
    </a>
    <a
      class="btn-secondary btn-sm"
      href="/invoices/{data.invoice.id}/print"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Printer size={15} /> Cetak
    </a>
  </div>
</div>

<PageHeader
  eyebrow="Detail tagihan"
  title={data.invoice.invoiceNumber}
  subtitle="{data.invoice.tenantName} · {data.invoice.propertyName} · kamar {data.invoice
    .roomNumber}"
>
  {#snippet actions()}
    {#if canVoid}
      <button class="btn-secondary btn-sm text-danger" onclick={() => (voidOpen = true)}
        ><XCircle size={15} /> Batalkan</button
      >
    {/if}
    {#if data.invoice.derivedStatus !== 'void' && Number(data.invoice.balance) > 0}
      <a class="btn-primary btn-sm" href="/payments/new?invoiceId={data.invoice.id}"
        ><Banknote size={16} /> Catat bayar</a
      >
    {/if}
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
  <section class="app-card card-pad">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Total tagihan</p>
        <p class="mt-1 text-3xl font-bold tracking-tight tabular-nums">
          {formatIdr(data.invoice.totalAmount)}
        </p>
      </div>
      <StatusBadge status={data.invoice.derivedStatus} />
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-paper p-3 text-sm">
      <div>
        <p class="text-xs text-muted">Sudah dibayar</p>
        <p class="mt-1 font-semibold tabular-nums">{formatIdr(data.invoice.paidAmount)}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Sisa</p>
        <p
          class="mt-1 font-semibold tabular-nums {Number(data.invoice.balance) > 0
            ? 'text-danger'
            : 'text-accent'}"
        >
          {formatIdr(data.invoice.balance)}
        </p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
      <div>
        <p class="text-xs text-muted">Periode</p>
        <p class="mt-0.5 font-medium">
          {formatIndonesianDate(data.invoice.periodStart)} – {formatIndonesianDate(
            data.invoice.periodEnd,
          )}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">Jatuh tempo</p>
        <p class="mt-0.5 font-medium">{formatIndonesianDate(data.invoice.dueDate)}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Penghuni</p>
        <a class="mt-0.5 font-medium hover:text-accent" href="/tenants/{data.invoice.tenantId}"
          >{data.invoice.tenantName}</a
        >
      </div>
      <div>
        <p class="text-xs text-muted">Telepon</p>
        <p class="mt-0.5 font-medium">{data.invoice.tenantPhone}</p>
      </div>
    </div>

    {#if data.invoice.notes}
      <p class="mt-4 border-t border-line pt-4 text-sm text-muted">{data.invoice.notes}</p>
    {/if}
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5"><h2 class="section-title">Rincian</h2></div>
    <ul class="divide-y divide-line">
      {#each data.invoice.items as item (item.id)}
        <li class="flex items-start justify-between gap-3 px-4 py-3">
          <div>
            <p class="text-sm font-medium">{item.description}</p>
            <p class="text-[11px] uppercase tracking-wide text-muted">{item.itemType}</p>
          </div>
          <p class="text-sm font-semibold tabular-nums">{formatIdr(item.amount)}</p>
        </li>
      {/each}
    </ul>
    <div class="border-t border-line px-4 py-3">
      <div class="flex justify-between text-sm">
        <span class="text-muted">Subtotal</span><span class="tabular-nums"
          >{formatIdr(data.invoice.subtotal)}</span
        >
      </div>
      {#if Number(data.invoice.discountAmount) > 0}
        <div class="mt-1 flex justify-between text-sm">
          <span class="text-muted">Diskon</span><span class="tabular-nums"
            >−{formatIdr(data.invoice.discountAmount)}</span
          >
        </div>
      {/if}
      <div class="mt-2 flex justify-between border-t border-line pt-2 text-sm font-bold">
        <span>Total</span><span class="tabular-nums">{formatIdr(data.invoice.totalAmount)}</span>
      </div>
    </div>
  </section>
</div>

<section class="app-card mt-4">
  <div class="border-b border-line px-4 py-3.5">
    <h2 class="section-title">Pembayaran diterima</h2>
  </div>
  {#if data.invoice.allocations.length === 0}
    <p class="px-4 py-6 text-center text-sm text-muted">Belum ada pembayaran untuk tagihan ini.</p>
  {:else}
    <ul class="divide-y divide-line">
      {#each data.invoice.allocations as allocation (allocation.id)}
        <li class="flex items-start justify-between gap-3 px-4 py-3.5">
          <div>
            <p class="text-sm font-semibold">{allocation.paymentNumber}</p>
            <p class="text-xs text-muted">
              {formatIndonesianDate(allocation.paidAt)} · {allocation.method === 'cash'
                ? 'Tunai'
                : 'Transfer bank'}{allocation.reference ? ` · ${allocation.reference}` : ''}
            </p>
          </div>
          <p class="text-sm font-bold tabular-nums text-accent">{formatIdr(allocation.amount)}</p>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<Modal
  open={voidOpen}
  title="Batalkan tagihan"
  description="Gunakan hanya jika tagihan salah diterbitkan dan belum dibayar."
  onclose={() => (voidOpen = false)}
>
  <form id="void-invoice" class="space-y-4" onsubmit={voidInvoice}>
    <div class="field">
      <label class="label" for="reason">Alasan pembatalan</label>
      <textarea
        id="reason"
        class="input"
        bind:value={reason}
        required
        minlength="3"
        placeholder="Contoh: kontrak dibatalkan"></textarea>
    </div>
    <p class="rounded-xl bg-danger-soft p-3 text-xs leading-5 text-danger">
      Invoice tidak dihapus. Status berubah menjadi batal dan tetap tercatat di audit log.
    </p>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (voidOpen = false)}
        >Tutup</button
      >
      <button
        class="btn-primary flex-1 bg-danger hover:bg-danger-dark"
        type="submit"
        form="void-invoice"
        disabled={saving}
      >
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Batalkan
      </button>
    </div>
  {/snippet}
</Modal>
