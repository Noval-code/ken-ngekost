<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDateTime } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import { ArrowLeft, LoaderCircle, Plus, Undo2 } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let refundOpen = $state(false);
  let receiveOpen = $state(false);
  let saving = $state(false);
  let amount = $state('');
  let reason = $state('');
  let receiveAmount = $state('');
  let receiveNotes = $state('');

  const hasHeld = $derived(Number(data.deposit.heldAmount) > 0);

  async function refund(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/deposits/${data.deposit.id}/refund`, {
        method: 'POST',
        body: { amount: Number(amount).toFixed(2), reason },
      });
      toasts.success('Refund deposit dicatat.');
      refundOpen = false;
      amount = '';
      reason = '';
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal mencatat refund.');
    } finally {
      saving = false;
    }
  }

  async function receive(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/deposits', {
        body: {
          leaseId: data.deposit.leaseId,
          amount: Number(receiveAmount).toFixed(2),
          notes: receiveNotes || undefined,
        },
      });
      toasts.success('Deposit tambahan dicatat.');
      receiveOpen = false;
      receiveAmount = '';
      receiveNotes = '';
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal mencatat deposit.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Deposit {data.deposit.tenantName} · Panggora</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/deposits"
  >
    <ArrowLeft size={14} /> Kembali ke deposit
  </a>
</div>

<PageHeader
  eyebrow="Detail deposit"
  title={data.deposit.tenantName}
  subtitle="{data.deposit.propertyName} · kamar {data.deposit.roomNumber}"
>
  {#snippet actions()}
    <button class="btn-secondary btn-sm" onclick={() => (receiveOpen = true)}
      ><Plus size={15} /> Tambah</button
    >
    {#if hasHeld}<button class="btn-primary btn-sm" onclick={() => (refundOpen = true)}
        ><Undo2 size={15} /> Refund</button
      >{/if}
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
  <section class="app-card card-pad">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Deposit ditahan</p>
        <p class="mt-1 text-3xl font-bold tabular-nums">{formatIdr(data.deposit.heldAmount)}</p>
      </div>
      <StatusBadge status={data.deposit.status} />
    </div>
    <dl class="mt-5 space-y-3 border-t border-line pt-4 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Diterima</dt>
        <dd class="font-medium tabular-nums">{formatIdr(data.deposit.amountReceived)}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">Direfund</dt>
        <dd class="font-medium tabular-nums">{formatIdr(data.deposit.amountRefunded)}</dd>
      </div>
    </dl>
    {#if data.deposit.notes}<p class="mt-4 border-t border-line pt-4 text-sm text-muted">
        {data.deposit.notes}
      </p>{/if}
    <a class="btn-secondary btn-sm mt-4" href="/leases/{data.deposit.leaseId}">Lihat kontrak</a>
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5">
      <h2 class="section-title">Riwayat transaksi</h2>
    </div>
    {#if data.deposit.history.length === 0}
      <p class="px-4 py-6 text-center text-sm text-muted">Belum ada transaksi.</p>
    {:else}
      <ul class="divide-y divide-line">
        {#each data.deposit.history as transaction (transaction.id)}
          <li class="flex items-start justify-between gap-3 px-4 py-3.5">
            <div>
              <p class="text-sm font-semibold">
                {transaction.type === 'received' ? 'Deposit diterima' : 'Refund deposit'}
              </p>
              <p class="text-xs text-muted">{formatIndonesianDateTime(transaction.createdAt)}</p>
              {#if transaction.notes}<p class="mt-1 text-xs text-muted">{transaction.notes}</p>{/if}
            </div>
            <p
              class="text-sm font-bold tabular-nums {transaction.type === 'received'
                ? 'text-accent'
                : 'text-amber'}"
            >
              {transaction.type === 'received' ? '+' : '−'}{formatIdr(transaction.amount)}
            </p>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<Modal
  open={refundOpen}
  title="Refund deposit"
  description="Kembalikan sebagian atau seluruh deposit."
  onclose={() => (refundOpen = false)}
>
  <form id="refund-deposit" class="space-y-4" onsubmit={refund}>
    <div class="field">
      <label class="label" for="amount">Nominal refund</label>
      <input
        id="amount"
        class="input"
        type="number"
        min="0.01"
        max={data.deposit.heldAmount}
        step="0.01"
        bind:value={amount}
        required
      />
      <p class="hint">Maksimal {formatIdr(data.deposit.heldAmount)}.</p>
    </div>
    <div class="field">
      <label class="label" for="reason">Alasan / catatan</label>
      <textarea
        id="reason"
        class="input"
        bind:value={reason}
        required
        minlength="3"
        placeholder="Contoh: kontrak selesai, tanpa potongan"></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (refundOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="refund-deposit" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Refund
      </button>
    </div>
  {/snippet}
</Modal>

<Modal
  open={receiveOpen}
  title="Tambah deposit"
  description="Catat penerimaan deposit tambahan untuk kontrak ini."
  onclose={() => (receiveOpen = false)}
>
  <form id="receive-deposit" class="space-y-4" onsubmit={receive}>
    <div class="field">
      <label class="label" for="receiveAmount">Nominal</label>
      <input
        id="receiveAmount"
        class="input"
        type="number"
        min="0.01"
        step="0.01"
        bind:value={receiveAmount}
        required
      />
    </div>
    <div class="field">
      <label class="label" for="receiveNotes">Catatan</label>
      <textarea id="receiveNotes" class="input" bind:value={receiveNotes}></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (receiveOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="receive-deposit" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
