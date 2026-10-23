<script lang="ts">
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import {
    formatIdr,
    formatIndonesianDate,
    formatIndonesianDateTime,
    statusLabel,
  } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import { ArrowLeft, LoaderCircle, ReceiptText, XCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let voidOpen = $state(false);
  let saving = $state(false);
  let reason = $state('');

  const canVoid = $derived(
    data.payment.status === 'received' &&
      (page.data.me.membership.role === 'owner' || page.data.me.membership.role === 'admin'),
  );

  async function voidPayment(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/payments/${data.payment.id}/void`, {
        method: 'POST',
        body: { reason },
      });
      toasts.success('Pembayaran dibatalkan.');
      voidOpen = false;
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal membatalkan pembayaran.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{data.payment.paymentNumber} · Ken Ngekost</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/payments"
  >
    <ArrowLeft size={14} /> Kembali ke pembayaran
  </a>
</div>

<PageHeader
  eyebrow="Detail pembayaran"
  title={data.payment.paymentNumber}
  subtitle="{formatIndonesianDate(data.payment.paidAt)} · {statusLabel(data.payment.method)}"
>
  {#snippet actions()}
    {#if canVoid}<button class="btn-secondary btn-sm text-danger" onclick={() => (voidOpen = true)}
        ><XCircle size={15} /> Batalkan</button
      >{/if}
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
  <section class="app-card card-pad">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Nominal diterima
        </p>
        <p class="mt-1 text-3xl font-bold tabular-nums">{formatIdr(data.payment.amount)}</p>
      </div>
      <StatusBadge status={data.payment.status} />
    </div>
    <dl class="mt-5 space-y-3 border-t border-line pt-4 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Metode</dt>
        <dd class="font-medium">{statusLabel(data.payment.method)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Tanggal</dt>
        <dd class="font-medium">{formatIndonesianDate(data.payment.paidAt)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Referensi</dt>
        <dd class="text-right font-medium">{data.payment.reference || '—'}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Dicatat</dt>
        <dd class="text-right font-medium">{formatIndonesianDateTime(data.payment.createdAt)}</dd>
      </div>
    </dl>
    {#if data.payment.notes}
      <p class="mt-4 border-t border-line pt-4 text-sm text-muted">{data.payment.notes}</p>
    {/if}
    {#if data.payment.status === 'void'}
      <div class="mt-4 rounded-xl bg-danger-soft p-3 text-xs leading-5 text-danger">
        <p class="font-semibold">Pembayaran dibatalkan</p>
        <p>{data.payment.voidReason}</p>
        {#if data.payment.voidedAt}<p>{formatIndonesianDateTime(data.payment.voidedAt)}</p>{/if}
      </div>
    {/if}
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5">
      <h2 class="section-title">Alokasi tagihan</h2>
    </div>
    <ul class="divide-y divide-line">
      {#each data.payment.allocations as allocation (allocation.id)}
        <li>
          <a
            class="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
            href="/invoices/{allocation.invoiceId}"
          >
            <div>
              <p class="flex items-center gap-1.5 text-sm font-semibold">
                <ReceiptText size={14} />
                {allocation.invoiceNumber}
              </p>
              <p class="mt-0.5 text-xs text-muted">
                {allocation.tenantName} · {allocation.propertyName} · {allocation.roomNumber}
              </p>
              <p class="text-xs text-muted">
                {formatIndonesianDate(allocation.periodStart)} – {formatIndonesianDate(
                  allocation.periodEnd,
                )}
              </p>
            </div>
            <p class="text-sm font-bold tabular-nums">{formatIdr(allocation.amount)}</p>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</div>

<Modal
  open={voidOpen}
  title="Batalkan pembayaran"
  description="Saldo tagihan terkait akan kembali terbuka."
  onclose={() => (voidOpen = false)}
>
  <form id="void-payment" class="space-y-4" onsubmit={voidPayment}>
    <div class="field">
      <label class="label" for="reason">Alasan</label>
      <textarea
        id="reason"
        class="input"
        bind:value={reason}
        required
        minlength="3"
        placeholder="Contoh: salah input nominal"></textarea>
    </div>
    <p class="rounded-xl bg-danger-soft p-3 text-xs leading-5 text-danger">
      Pembayaran tidak dihapus. Pembatalan tercatat permanen untuk audit.
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
        form="void-payment"
        disabled={saving}
      >
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Batalkan
      </button>
    </div>
  {/snippet}
</Modal>
