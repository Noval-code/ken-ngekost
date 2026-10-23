<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ArrowLeft, FilePlus2, LoaderCircle, Pencil, UserRound } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let editOpen = $state(false);
  let saving = $state(false);
  let roomNumber = $state(data.room.roomNumber);
  let baseRent = $state(data.room.baseRent);
  let status = $state(data.room.operationalStatus);

  const activeLease = $derived(data.room.leases.find((row) => row.lease.status === 'active'));

  function openEdit() {
    roomNumber = data.room.roomNumber;
    baseRent = data.room.baseRent;
    status = data.room.operationalStatus;
    editOpen = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/rooms/${data.room.id}`, {
        method: 'PATCH',
        body: { roomNumber, baseRent: Number(baseRent).toFixed(2), operationalStatus: status },
      });
      toasts.success('Kamar diperbarui.');
      editOpen = false;
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal memperbarui kamar.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Kamar {data.room.roomNumber} · Ken Ngekost</title></svelte:head>

<div class="mb-4 flex flex-wrap items-center gap-3">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/rooms"
  >
    <ArrowLeft size={14} /> Kembali ke kamar
  </a>
  <a class="text-xs text-muted hover:text-ink" href="/properties/{data.room.propertyId}"
    >· {data.room.propertyName}</a
  >
</div>

<PageHeader
  eyebrow="Detail kamar"
  title="Kamar {data.room.roomNumber}"
  subtitle="{data.room.propertyName} · {formatIdr(data.room.baseRent)} / bulan"
>
  {#snippet actions()}
    <button class="btn-secondary btn-sm" onclick={openEdit}><Pencil size={15} /> Edit</button>
    {#if !activeLease}
      <a class="btn-primary btn-sm" href="/leases/new?roomId={data.room.id}"
        ><FilePlus2 size={16} /> Buat kontrak</a
      >
    {/if}
  {/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
  <section class="app-card card-pad">
    <div class="flex items-center justify-between gap-3">
      <h2 class="section-title">Status saat ini</h2>
      <StatusBadge status={activeLease ? 'occupied' : data.room.operationalStatus} />
    </div>
    {#if activeLease}
      <div class="mt-4 rounded-xl bg-accent-soft p-4">
        <p class="flex items-center gap-2 font-semibold text-accent-dark">
          <UserRound size={17} />
          {activeLease.tenantName}
        </p>
        <p class="mt-1 text-xs text-accent-dark/80">{activeLease.tenantPhone}</p>
        <p class="mt-3 text-xs text-accent-dark/80">
          {formatIndonesianDate(activeLease.lease.startDate)} – {formatIndonesianDate(
            activeLease.lease.endDate,
          )}
        </p>
        <a class="btn-secondary btn-sm mt-3 bg-white/60" href="/leases/{activeLease.lease.id}"
          >Lihat kontrak</a
        >
      </div>
    {:else}
      <div class="mt-4 rounded-xl border border-dashed border-line p-5 text-center">
        <p class="text-sm font-semibold">Kamar kosong</p>
        <p class="mt-1 text-xs text-muted">
          Buat kontrak untuk mengisi kamar dan menerbitkan tagihan pertama.
        </p>
        <a class="btn-primary btn-sm mt-3" href="/leases/new?roomId={data.room.id}">Buat kontrak</a>
      </div>
    {/if}
    {#if data.room.description}
      <p class="mt-4 border-t border-line pt-3 text-sm text-muted">{data.room.description}</p>
    {/if}
  </section>

  <section class="app-card">
    <div class="border-b border-line px-4 py-3.5">
      <h2 class="section-title">Riwayat kontrak</h2>
    </div>
    {#if data.room.leases.length === 0}
      <EmptyState title="Belum ada kontrak" description="Riwayat kontrak akan tampil di sini." />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.room.leases as row (row.lease.id)}
          <li>
            <a
              class="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-paper/60"
              href="/leases/{row.lease.id}"
            >
              <div>
                <p class="text-sm font-semibold">{row.tenantName}</p>
                <p class="text-xs text-muted">
                  {formatIndonesianDate(row.lease.startDate)} – {formatIndonesianDate(
                    row.lease.endDate,
                  )}
                </p>
              </div>
              <StatusBadge status={row.lease.status} />
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<Modal open={editOpen} title="Edit kamar" onclose={() => (editOpen = false)}>
  <form id="edit-room" class="space-y-4" onsubmit={save}>
    <div class="field">
      <label class="label" for="number">Nomor kamar</label>
      <input id="number" class="input" bind:value={roomNumber} required />
    </div>
    <div class="field">
      <label class="label" for="rent">Sewa dasar / bulan</label>
      <input
        id="rent"
        class="input"
        type="number"
        min="0"
        step="1000"
        bind:value={baseRent}
        required
      />
    </div>
    <div class="field">
      <label class="label" for="status">Status operasional</label>
      <select id="status" class="select" bind:value={status}>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>
    <p class="hint">Perubahan harga kamar tidak mengubah kontrak atau tagihan yang sudah ada.</p>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (editOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="edit-room" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
