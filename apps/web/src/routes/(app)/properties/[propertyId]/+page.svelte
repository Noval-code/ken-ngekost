<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import {
    ArrowLeft,
    DoorOpen,
    LoaderCircle,
    MapPin,
    Pencil,
    Plus,
    UserRound,
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let roomOpen = $state(false);
  let editOpen = $state(false);
  let saving = $state(false);

  let roomNumber = $state('');
  let baseRent = $state('');
  let roomStatus = $state('active');
  let roomDescription = $state('');

  let editName = $state(data.property.name);
  let editAddress = $state(data.property.address);
  let editDescription = $state(data.property.description ?? '');
  let editStatus = $state(data.property.status);

  function openEdit() {
    editName = data.property.name;
    editAddress = data.property.address;
    editDescription = data.property.description ?? '';
    editStatus = data.property.status;
    editOpen = true;
  }

  async function addRoom(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/rooms', {
        body: {
          propertyId: data.property.id,
          roomNumber,
          baseRent: Number(baseRent).toFixed(2),
          operationalStatus: roomStatus,
          description: roomDescription || undefined,
        },
      });
      toasts.success('Kamar berhasil ditambahkan.');
      roomOpen = false;
      roomNumber = '';
      baseRent = '';
      roomDescription = '';
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menambah kamar.');
    } finally {
      saving = false;
    }
  }

  async function saveProperty(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/properties/${data.property.id}`, {
        method: 'PATCH',
        body: {
          name: editName,
          address: editAddress,
          description: editDescription || undefined,
          status: editStatus,
        },
      });
      toasts.success('Properti diperbarui.');
      editOpen = false;
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal memperbarui properti.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{data.property.name} · Ken Ngekost</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/properties"
  >
    <ArrowLeft size={14} /> Kembali ke properti
  </a>
</div>

<PageHeader eyebrow="Detail properti" title={data.property.name} subtitle={data.property.address}>
  {#snippet actions()}
    <button class="btn-secondary btn-sm" onclick={openEdit}><Pencil size={15} /> Edit</button>
    <button class="btn-primary btn-sm" onclick={() => (roomOpen = true)}
      ><Plus size={16} /> Kamar</button
    >
  {/snippet}
</PageHeader>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  <div class="app-card p-4">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Total kamar</p>
    <p class="stat-value">{data.property.stats.roomCount}</p>
  </div>
  <div class="app-card p-4">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Terisi</p>
    <p class="stat-value text-accent">{data.property.stats.occupiedRooms}</p>
  </div>
  <div class="app-card p-4">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Kosong</p>
    <p class="stat-value text-amber">{data.property.stats.vacantRooms}</p>
  </div>
  <div class="app-card p-4">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Hunian</p>
    <p class="stat-value">{data.property.stats.occupancyRate}%</p>
  </div>
</div>

<details class="app-card mt-4 p-4">
  <summary class="cursor-pointer text-sm font-semibold">Informasi properti</summary>
  <div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
    <p class="flex items-start gap-2 text-muted">
      <MapPin size={15} class="mt-0.5 shrink-0" />
      {data.property.address}
    </p>
    <p class="flex items-center gap-2 text-muted">
      <span class="text-[10px] font-semibold uppercase tracking-wider">Status</span>
      <StatusBadge status={data.property.status} />
    </p>
    {#if data.property.description}<p class="sm:col-span-2 text-muted">
        {data.property.description}
      </p>{/if}
  </div>
</details>

<div class="mt-5 flex items-center justify-between">
  <h2 class="section-title">Kamar</h2>
  <span class="text-xs text-muted">{data.rooms.length} kamar</span>
</div>

{#if data.rooms.length === 0}
  <div class="app-card mt-3">
    <EmptyState
      title="Belum ada kamar"
      description="Tambahkan kamar untuk properti ini agar bisa dihuni dan ditagih."
    >
      {#snippet action()}
        <button class="btn-primary btn-sm" onclick={() => (roomOpen = true)}
          ><Plus size={16} /> Tambah kamar</button
        >
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#each data.rooms as room (room.id)}
      <a class="app-card block p-4 hover:border-accent/30" href="/rooms/{room.id}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="flex size-9 items-center justify-center rounded-lg bg-paper text-muted"
              ><DoorOpen size={17} /></span
            >
            <div>
              <p class="font-bold">{room.roomNumber}</p>
              <p class="text-xs text-muted">{formatIdr(room.baseRent)} / bulan</p>
            </div>
          </div>
          <StatusBadge status={room.occupancy} />
        </div>
        <div class="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
          <span class="text-muted">Penghuni</span>
          <span class="flex items-center gap-1 font-semibold">
            {#if room.activeTenantName}<UserRound size={13} /> {room.activeTenantName}{:else}—{/if}
          </span>
        </div>
      </a>
    {/each}
  </div>
{/if}

<Modal
  open={roomOpen}
  title="Kamar baru"
  description="Nomor kamar harus unik di properti ini."
  onclose={() => (roomOpen = false)}
>
  <form id="room-form" class="space-y-4" onsubmit={addRoom}>
    <div class="grid grid-cols-2 gap-3">
      <div class="field">
        <label class="label" for="roomNumber">Nomor kamar</label>
        <input id="roomNumber" class="input" bind:value={roomNumber} placeholder="A-01" required />
      </div>
      <div class="field">
        <label class="label" for="roomStatus">Status</label>
        <select id="roomStatus" class="select" bind:value={roomStatus}>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label class="label" for="baseRent">Sewa dasar / bulan</label>
      <div class="relative">
        <span
          class="pointer-events-none absolute left-3 top-0 flex h-11 items-center text-sm text-muted"
          >Rp</span
        >
        <input
          id="baseRent"
          class="input pl-10"
          type="number"
          min="0"
          step="1000"
          bind:value={baseRent}
          placeholder="1500000"
          required
        />
      </div>
    </div>
    <div class="field">
      <label class="label" for="roomDescription">Catatan</label>
      <textarea id="roomDescription" class="input" bind:value={roomDescription}></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (roomOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="room-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan kamar
      </button>
    </div>
  {/snippet}
</Modal>

<Modal open={editOpen} title="Edit properti" onclose={() => (editOpen = false)}>
  <form id="edit-property-form" class="space-y-4" onsubmit={saveProperty}>
    <div class="field">
      <label class="label" for="editName">Nama properti</label>
      <input id="editName" class="input" bind:value={editName} required />
    </div>
    <div class="field">
      <label class="label" for="editAddress">Alamat</label>
      <textarea id="editAddress" class="input" bind:value={editAddress} required></textarea>
    </div>
    <div class="field">
      <label class="label" for="editStatus">Status</label>
      <select id="editStatus" class="select" bind:value={editStatus}>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>
    <div class="field">
      <label class="label" for="editDescription">Catatan</label>
      <textarea id="editDescription" class="input" bind:value={editDescription}></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (editOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="edit-property-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
