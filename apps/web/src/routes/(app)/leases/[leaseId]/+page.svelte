<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ArrowLeft, LoaderCircle, LogOut, ReceiptText } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let endOpen = $state(false);
  let saving = $state(false);
  let endDate = $state(data.lease.endDate);
  let reason = $state('');

  function invoiceStatus(invoice: PageData['lease']['invoices'][number]) {
    if (invoice.status === 'void') return 'void';
    if (Number(invoice.balance) <= 0) return 'paid';
    if (Number(invoice.paidAmount) > 0) return 'partial';
    if (invoice.dueDate < new Date().toISOString().slice(0, 10)) return 'overdue';
    return 'unpaid';
  }

  async function endLease(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/leases/${data.lease.id}/end`, {
        method: 'POST',
        body: { endDate, reason },
      });
      toasts.success('Kontrak diakhiri. Kamar kembali tersedia.');
      endOpen = false;
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal mengakhiri kontrak.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Kontrak {data.lease.tenantName} · Panggora</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/leases"
  >
    <ArrowLeft size={14} /> Kembali ke kontrak
  </a>
</div>

<PageHeader
  eyebrow="Detail kontrak"
  title={data.lease.tenantName}
  subtitle="{data.lease.propertyName} · kamar {data.lease.roomNumber}"
>
  {#snippet actions()}
    {#if data.lease.status === 'active'}
      <button class="btn-secondary btn-sm text-danger" onclick={() => (endOpen = true)}
        ><LogOut size={15} /> Akhiri</button
      >
    {/if}
    <a class="btn-primary btn-sm" href="/invoices?search={data.lease.tenantName}"
      ><ReceiptText size={16} /> Tagihan</a
    >
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
  <section class="app-card card-pad">
    <div class="flex items-center justify-between gap-3">
      <h2 class="section-title">Ketentuan sewa</h2>
      <StatusBadge status={data.lease.status} />
    </div>
    <dl class="mt-4 space-y-3 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Mulai</dt>
        <dd class="font-medium">{formatIndonesianDate(data.lease.startDate)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Akhir</dt>
        <dd class="font-medium">{formatIndonesianDate(data.lease.endDate)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Sewa bulanan</dt>
        <dd class="font-bold tabular-nums">{formatIdr(data.lease.rentAmount)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Deposit</dt>
        <dd class="font-medium tabular-nums">{formatIdr(data.lease.depositAmount)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Jatuh tempo</dt>
        <dd class="text-right font-medium">Tanggal {data.lease.billingAnchorDay} tiap bulan</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Telepon</dt>
        <dd class="font-medium">{data.lease.tenantPhone}</dd>
      </div>
    </dl>
    <div class="mt-4 border-t border-line pt-4">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Catatan</p>
      <p class="mt-1 whitespace-pre-line text-sm text-muted">
        {data.lease.notes || 'Tidak ada catatan.'}
      </p>
    </div>
    <div class="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
      <a class="btn-secondary btn-sm" href="/tenants/{data.lease.tenantId}">Penghuni</a>
      <a class="btn-secondary btn-sm" href="/rooms/{data.lease.roomId}">Kamar</a>
    </div>
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5">
      <h2 class="section-title">Tagihan kontrak</h2>
    </div>
    {#if data.lease.invoices.length === 0}
      <EmptyState
        title="Belum ada tagihan"
        description="Invoice dibuat otomatis saat periode berjalan."
      />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.lease.invoices as invoice (invoice.id)}
          <li>
            <a
              class="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
              href="/invoices/{invoice.id}"
            >
              <div>
                <p class="text-sm font-semibold">{invoice.invoiceNumber}</p>
                <p class="text-xs text-muted">
                  {formatIndonesianDate(invoice.periodStart)} – {formatIndonesianDate(
                    invoice.periodEnd,
                  )}
                </p>
                <p class="mt-1 text-xs text-muted">
                  Jatuh tempo {formatIndonesianDate(invoice.dueDate)}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold tabular-nums">{formatIdr(invoice.totalAmount)}</p>
                <div class="mt-1"><StatusBadge status={invoiceStatus(invoice)} /></div>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<Modal
  open={endOpen}
  title="Akhiri kontrak"
  description="Kamar akan menjadi kosong. Tagihan lama tetap tersimpan."
  onclose={() => (endOpen = false)}
>
  <form id="end-lease" class="space-y-4" onsubmit={endLease}>
    <div class="field">
      <label class="label" for="endDate">Tanggal akhir efektif</label>
      <input
        id="endDate"
        class="input"
        type="date"
        min={data.lease.startDate}
        bind:value={endDate}
        required
      />
    </div>
    <div class="field">
      <label class="label" for="reason">Alasan</label>
      <textarea
        id="reason"
        class="input"
        bind:value={reason}
        required
        minlength="3"
        placeholder="Contoh: penghuni pindah"></textarea>
    </div>
    <p class="rounded-xl bg-danger-soft p-3 text-xs leading-5 text-danger">
      Tindakan ini tidak menghapus tagihan atau pembayaran. Pastikan sisa saldo sudah diselesaikan.
    </p>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (endOpen = false)}
        >Batal</button
      >
      <button
        class="btn-primary flex-1 bg-danger hover:bg-danger-dark"
        type="submit"
        form="end-lease"
        disabled={saving}
      >
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Akhiri kontrak
      </button>
    </div>
  {/snippet}
</Modal>
