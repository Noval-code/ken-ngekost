<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError, newIdempotencyKey } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ArrowLeft, LoaderCircle, Wallet } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const idempotencyKey = newIdempotencyKey();
  let invoiceId = $state(data.preselectedInvoiceId || data.invoices[0]?.id || '');
  let amount = $state('');
  let method = $state('bank_transfer');
  let paidAt = $state(new Date().toISOString().slice(0, 10));
  let reference = $state('');
  let notes = $state('');
  let saving = $state(false);

  const selected = $derived(data.invoices.find((invoice) => invoice.id === invoiceId));

  $effect(() => {
    if (selected && !amount) amount = selected.balance.replace(/\.00$/, '');
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      const result = await api<{ data: { id: string; duplicated: boolean } }>('/payments', {
        body: {
          amount: Number(amount).toFixed(2),
          method,
          paidAt,
          reference: reference || undefined,
          notes: notes || undefined,
          idempotencyKey,
          allocations: [{ invoiceId, amount: Number(amount).toFixed(2) }],
        },
      });
      toasts.success(
        result.data.duplicated ? 'Pembayaran sudah tercatat.' : 'Pembayaran berhasil dicatat.',
      );
      await goto(`/payments/${result.data.id}`);
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal mencatat pembayaran.');
      saving = false;
    }
  }
</script>

<svelte:head><title>Catat pembayaran · Panggora</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/payments"
  >
    <ArrowLeft size={14} /> Kembali ke pembayaran
  </a>
</div>

<PageHeader
  eyebrow="Pembayaran baru"
  title="Catat pembayaran"
  subtitle="Alokasikan pembayaran ke satu tagihan."
/>

{#if data.invoices.length === 0}
  <div class="app-card">
    <EmptyState
      title="Tidak ada tagihan terbuka"
      description="Semua tagihan sudah lunas atau belum ada tagihan diterbitkan."
    >
      {#snippet action()}<a class="btn-primary btn-sm" href="/invoices">Lihat tagihan</a>{/snippet}
    </EmptyState>
  </div>
{:else}
  <form class="grid gap-4 lg:grid-cols-[1.35fr_1fr]" onsubmit={submit}>
    <div class="space-y-4">
      <section class="app-card card-pad space-y-4">
        <h2 class="section-title">Tagihan</h2>
        <div class="field">
          <label class="label" for="invoice">Pilih tagihan</label>
          <select id="invoice" class="select" bind:value={invoiceId} required>
            {#each data.invoices as invoice (invoice.id)}
              <option value={invoice.id}
                >{invoice.invoiceNumber} · {invoice.tenantName} · sisa {formatIdr(
                  invoice.balance,
                )}</option
              >
            {/each}
          </select>
        </div>
        {#if selected}
          <div class="rounded-xl bg-paper p-3 text-xs leading-5 text-muted">
            <p class="font-semibold text-ink">
              {selected.propertyName} · kamar {selected.roomNumber}
            </p>
            <p>
              {formatIndonesianDate(selected.periodStart)} – {formatIndonesianDate(
                selected.periodEnd,
              )}
            </p>
            <p>
              Jatuh tempo {formatIndonesianDate(selected.dueDate)} · sisa
              <span class="font-bold text-ink">{formatIdr(selected.balance)}</span>
            </p>
          </div>
        {/if}
      </section>

      <section class="app-card card-pad space-y-4">
        <h2 class="section-title">Detail pembayaran</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field">
            <label class="label" for="amount">Nominal</label>
            <input
              id="amount"
              class="input"
              type="number"
              min="0.01"
              max={selected ? selected.balance : undefined}
              step="0.01"
              bind:value={amount}
              required
            />
          </div>
          <div class="field">
            <label class="label" for="method">Metode</label>
            <select id="method" class="select" bind:value={method}>
              <option value="bank_transfer">Transfer bank</option>
              <option value="cash">Tunai</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field">
            <label class="label" for="paidAt">Tanggal bayar</label>
            <input id="paidAt" class="input" type="date" bind:value={paidAt} required />
          </div>
          <div class="field">
            <label class="label" for="reference">Referensi</label>
            <input
              id="reference"
              class="input"
              bind:value={reference}
              placeholder="No. transfer / bukti"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="notes">Catatan</label>
          <textarea id="notes" class="input" bind:value={notes}></textarea>
        </div>
      </section>
    </div>

    <aside class="space-y-3 lg:sticky lg:top-6 lg:self-start">
      <div class="app-card card-pad">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
          ><Wallet size={19} /></span
        >
        <h2 class="mt-3 section-title">Ringkasan</h2>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Invoice</dt>
            <dd class="text-right font-semibold">{selected?.invoiceNumber ?? '—'}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Nominal</dt>
            <dd class="text-right font-bold tabular-nums">
              {amount ? formatIdr(Number(amount).toFixed(2)) : '—'}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sisa setelah bayar</dt>
            <dd class="text-right font-semibold tabular-nums">
              {selected
                ? formatIdr(Math.max(0, Number(selected.balance) - Number(amount || 0)).toFixed(2))
                : '—'}
            </dd>
          </div>
        </dl>
        <p class="mt-4 rounded-xl bg-paper p-3 text-xs leading-5 text-muted">
          Pembayaran tidak dapat diedit. Jika salah, batalkan pembayaran lalu catat ulang.
        </p>
      </div>
      <button class="btn-primary w-full" type="submit" disabled={saving}>
        {#if saving}<LoaderCircle size={18} class="animate-spin" />{/if} Simpan pembayaran
      </button>
    </aside>
  </form>
{/if}
