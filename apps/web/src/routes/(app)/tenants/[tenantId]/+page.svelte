<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate, initials } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ArrowLeft, FilePlus2, LoaderCircle, Pencil, Phone } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let editOpen = $state(false);
  let saving = $state(false);
  let name = $state(data.tenant.name);
  let phone = $state(data.tenant.phone);
  let notes = $state(data.tenant.notes ?? '');

  function openEdit() {
    name = data.tenant.name;
    phone = data.tenant.phone;
    notes = data.tenant.notes ?? '';
    editOpen = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/tenants/${data.tenant.id}`, {
        method: 'PATCH',
        body: { name, phone, notes: notes || undefined },
      });
      toasts.success('Data penghuni diperbarui.');
      editOpen = false;
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal memperbarui penghuni.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{data.tenant.name} · Panggora</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/tenants"
  >
    <ArrowLeft size={14} /> Kembali ke penghuni
  </a>
</div>

<PageHeader
  eyebrow="Detail penghuni"
  title={data.tenant.name}
  subtitle="{data.tenant.phone} · bergabung {formatIndonesianDate(
    data.tenant.createdAt.slice(0, 10),
  )}"
>
  {#snippet actions()}
    <button class="btn-secondary btn-sm" onclick={openEdit}><Pencil size={15} /> Edit</button>
    <a class="btn-primary btn-sm" href="/leases/new?tenantId={data.tenant.id}"
      ><FilePlus2 size={16} /> Kontrak</a
    >
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
  <section class="app-card card-pad">
    <div class="flex items-center gap-3">
      <span
        class="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-lg font-bold text-accent-dark"
      >
        {initials(data.tenant.name)}
      </span>
      <div>
        <p class="font-bold">{data.tenant.name}</p>
        <p class="flex items-center gap-1.5 text-sm text-muted">
          <Phone size={14} />
          {data.tenant.phone}
        </p>
      </div>
    </div>
    <div class="mt-4 border-t border-line pt-4">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Catatan</p>
      <p class="mt-1 whitespace-pre-line text-sm text-muted">
        {data.tenant.notes || 'Tidak ada catatan.'}
      </p>
    </div>
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5">
      <h2 class="section-title">Riwayat kontrak</h2>
    </div>
    {#if data.tenant.leases.length === 0}
      <EmptyState
        title="Belum ada kontrak"
        description="Penghuni ini belum pernah menempati kamar."
      />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.tenant.leases as row (row.lease.id)}
          <li>
            <a
              class="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
              href="/leases/{row.lease.id}"
            >
              <div>
                <p class="font-semibold">{row.propertyName} · {row.roomNumber}</p>
                <p class="text-xs text-muted">
                  {formatIndonesianDate(row.lease.startDate)} – {formatIndonesianDate(
                    row.lease.endDate,
                  )}
                </p>
                <p class="mt-1 text-xs font-medium">{formatIdr(row.lease.rentAmount)} / bulan</p>
              </div>
              <StatusBadge status={row.lease.status} />
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<section class="app-card mt-4">
  <div class="border-b border-line px-4 py-3.5">
    <h2 class="section-title">Riwayat tagihan</h2>
  </div>
  {#if data.tenant.invoices.length === 0}
    <EmptyState title="Belum ada tagihan" description="Tagihan akan dibuat saat kontrak aktif." />
  {:else}
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Invoice</th><th>Kamar</th><th>Periode</th><th>Jatuh tempo</th><th>Nominal</th><th
            ></th></tr
          ></thead
        >
        <tbody>
          {#each data.tenant.invoices as row (row.invoice.id)}
            <tr>
              <td class="font-medium">{row.invoice.invoiceNumber}</td>
              <td>{row.roomNumber}</td>
              <td class="text-muted"
                >{formatIndonesianDate(row.invoice.periodStart)} – {formatIndonesianDate(
                  row.invoice.periodEnd,
                )}</td
              >
              <td>{formatIndonesianDate(row.invoice.dueDate)}</td>
              <td class="font-semibold tabular-nums">{formatIdr(row.invoice.totalAmount)}</td>
              <td class="text-right"
                ><a class="text-xs font-semibold text-accent" href="/invoices/{row.invoice.id}"
                  >Detail</a
                ></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.tenant.invoices as row (row.invoice.id)}
        <a class="flex items-center justify-between gap-3 p-4" href="/invoices/{row.invoice.id}">
          <div>
            <p class="text-sm font-semibold">{row.invoice.invoiceNumber}</p>
            <p class="text-xs text-muted">
              {formatIndonesianDate(row.invoice.periodStart)} · kamar {row.roomNumber}
            </p>
          </div>
          <p class="text-sm font-bold tabular-nums">{formatIdr(row.invoice.totalAmount)}</p>
        </a>
      {/each}
    </div>
  {/if}
</section>

<Modal open={editOpen} title="Edit penghuni" onclose={() => (editOpen = false)}>
  <form id="edit-tenant" class="space-y-4" onsubmit={save}>
    <div class="field">
      <label class="label" for="name">Nama</label>
      <input id="name" class="input" bind:value={name} required />
    </div>
    <div class="field">
      <label class="label" for="phone">Telepon</label>
      <input id="phone" class="input" type="tel" bind:value={phone} required />
    </div>
    <div class="field">
      <label class="label" for="notes">Catatan</label>
      <textarea id="notes" class="input" bind:value={notes}></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (editOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="edit-tenant" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
