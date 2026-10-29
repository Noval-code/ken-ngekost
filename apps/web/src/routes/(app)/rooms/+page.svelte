<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { DoorOpen, LoaderCircle, Plus, Search, UserRound } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let open = $state(false);
  let saving = $state(false);
  let propertyId = $state(data.filter.propertyId || data.properties[0]?.id || '');
  let roomNumber = $state('');
  let baseRent = $state('');
  let roomStatus = $state('active');

  async function addRoom(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/rooms', {
        body: {
          propertyId,
          roomNumber,
          baseRent: Number(baseRent).toFixed(2),
          operationalStatus: roomStatus,
        },
      });
      toasts.success('Kamar berhasil ditambahkan.');
      open = false;
      roomNumber = '';
      baseRent = '';
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menambah kamar.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Kamar · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Hunian"
  title="Kamar"
  subtitle="Cari kamar, lihat penghuni aktif, dan pantau kamar kosong."
>
  {#snippet actions()}
    <button
      class="btn-primary btn-sm"
      disabled={data.properties.length === 0}
      onclick={() => (open = true)}
    >
      <Plus size={16} /> Kamar baru
    </button>
  {/snippet}
</PageHeader>

<form class="app-card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto_auto]" method="get">
  <div class="relative">
    <Search size={17} class="pointer-events-none absolute left-3 top-0 mt-3 text-muted" />
    <input
      class="input pl-9"
      name="search"
      value={data.filter.search}
      placeholder="Cari nomor kamar, properti, penghuni"
    />
  </div>
  <select class="select sm:w-40" name="occupancy" value={data.filter.occupancy}>
    <option value="all">Semua hunian</option>
    <option value="occupied">Terisi</option>
    <option value="vacant">Kosong</option>
  </select>
  <select class="select sm:w-36" name="status" value={data.filter.status}>
    <option value="all">Semua status</option>
    <option value="active">Aktif</option>
    <option value="inactive">Nonaktif</option>
  </select>
  <select class="select sm:w-44" name="propertyId" value={data.filter.propertyId}>
    <option value="">Semua properti</option>
    {#each data.properties as property (property.id)}
      <option value={property.id}>{property.name}</option>
    {/each}
  </select>
  <button class="btn-secondary" type="submit">Filter</button>
</form>

{#if data.properties.length === 0}
  <div class="app-card">
    <EmptyState
      title="Tambahkan properti dulu"
      description="Kamar selalu berada di dalam satu properti."
    >
      {#snippet action()}<a class="btn-primary btn-sm" href="/properties">Buka properti</a
        >{/snippet}
    </EmptyState>
  </div>
{:else if data.rooms.length === 0}
  <div class="app-card">
    <EmptyState title="Tidak ada kamar" description="Ubah filter atau tambahkan kamar baru.">
      {#snippet action()}
        <button class="btn-primary btn-sm" onclick={() => (open = true)}
          ><Plus size={16} /> Tambah kamar</button
        >
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Kamar</th>
            <th>Properti</th>
            <th>Sewa</th>
            <th>Status</th>
            <th>Penghuni</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.rooms as room (room.id)}
            <tr>
              <td>
                <p class="font-semibold">{room.roomNumber}</p>
                <p class="text-xs text-muted">
                  {room.operationalStatus === 'active' ? 'Operasional' : 'Nonaktif'}
                </p>
              </td>
              <td class="text-muted">{room.propertyName}</td>
              <td class="font-medium tabular-nums">{formatIdr(room.baseRent)}</td>
              <td><StatusBadge status={room.occupancy} /></td>
              <td class="text-muted">{room.activeTenantName ?? '—'}</td>
              <td class="text-right"
                ><a class="text-xs font-semibold text-accent" href="/rooms/{room.id}">Detail</a></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="divide-y divide-line sm:hidden">
      {#each data.rooms as room (room.id)}
        <a class="flex items-start gap-3 p-4" href="/rooms/{room.id}">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper text-muted"
            ><DoorOpen size={18} /></span
          >
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-bold">{room.roomNumber}</p>
                <p class="text-xs text-muted">{room.propertyName}</p>
              </div>
              <StatusBadge status={room.occupancy} />
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{formatIdr(room.baseRent)} / bulan</span>
              {#if room.activeTenantName}
                <span class="flex items-center gap-1"
                  ><UserRound size={12} /> {room.activeTenantName}</span
                >
              {/if}
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}

<Modal {open} title="Kamar baru" onclose={() => (open = false)}>
  <form id="add-room" class="space-y-4" onsubmit={addRoom}>
    <div class="field">
      <label class="label" for="property">Properti</label>
      <select id="property" class="select" bind:value={propertyId} required>
        {#each data.properties as property (property.id)}
          <option value={property.id}>{property.name}</option>
        {/each}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="field">
        <label class="label" for="number">Nomor kamar</label>
        <input id="number" class="input" bind:value={roomNumber} required placeholder="A-01" />
      </div>
      <div class="field">
        <label class="label" for="status">Status</label>
        <select id="status" class="select" bind:value={roomStatus}>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label class="label" for="rent">Sewa / bulan</label>
      <input
        id="rent"
        class="input"
        type="number"
        min="0"
        step="1000"
        bind:value={baseRent}
        required
        placeholder="1500000"
      />
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (open = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="add-room" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
