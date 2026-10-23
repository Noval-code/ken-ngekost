<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { Building2, LoaderCircle, MapPin, Plus } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let open = $state(false);
  let saving = $state(false);
  let name = $state('');
  let address = $state('');
  let description = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/properties', {
        body: { name, address, description: description || undefined },
      });
      toasts.success('Properti berhasil ditambahkan.');
      open = false;
      name = '';
      address = '';
      description = '';
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menyimpan properti.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Properti · Ken Ngekost</title></svelte:head>

<PageHeader
  eyebrow="Lokasi"
  title="Properti"
  subtitle="Kelola lokasi kost, kamar, dan tingkat hunian."
>
  {#snippet actions()}
    <button class="btn-primary btn-sm" onclick={() => (open = true)}
      ><Plus size={16} /> Properti baru</button
    >
  {/snippet}
</PageHeader>

{#if data.properties.length === 0}
  <div class="app-card">
    <EmptyState
      title="Belum ada properti"
      description="Mulai dengan menambahkan satu lokasi kost, lalu tambahkan kamar di dalamnya."
    >
      {#snippet action()}
        <button class="btn-primary btn-sm" onclick={() => (open = true)}
          ><Plus size={16} /> Tambah properti</button
        >
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#each data.properties as property (property.id)}
      <a
        href="/properties/{property.id}"
        class="app-card group block p-4 transition-transform hover:-translate-y-0.5 hover:border-accent/30"
      >
        <div class="flex items-start justify-between gap-3">
          <span
            class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
          >
            <Building2 size={19} />
          </span>
          <StatusBadge status={property.status} />
        </div>
        <h2 class="mt-3 text-lg font-bold leading-tight">{property.name}</h2>
        <p class="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted">
          <MapPin size={13} class="mt-1 shrink-0" />
          <span class="line-clamp-2">{property.address}</span>
        </p>

        <div class="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Kamar</p>
            <p class="mt-0.5 text-lg font-bold tabular-nums">{property.roomCount}</p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Terisi</p>
            <p class="mt-0.5 text-lg font-bold tabular-nums text-accent">
              {property.occupiedRooms}
            </p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Hunian</p>
            <p class="mt-0.5 text-lg font-bold tabular-nums">{property.occupancyRate}%</p>
          </div>
        </div>

        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div class="h-full rounded-full bg-accent" style="width: {property.occupancyRate}%"></div>
        </div>
      </a>
    {/each}
  </div>
{/if}

<Modal
  {open}
  title="Properti baru"
  description="Data ini menjadi dasar semua kamar dan laporan."
  onclose={() => (open = false)}
>
  <form id="property-form" class="space-y-4" onsubmit={submit}>
    <div class="field">
      <label class="label" for="name">Nama properti</label>
      <input id="name" class="input" bind:value={name} placeholder="Contoh: Kost Melati" required />
    </div>
    <div class="field">
      <label class="label" for="address">Alamat</label>
      <textarea
        id="address"
        class="input"
        bind:value={address}
        placeholder="Alamat lengkap"
        required></textarea>
    </div>
    <div class="field">
      <label class="label" for="description"
        >Catatan <span class="font-normal text-muted">(opsional)</span></label
      >
      <textarea
        id="description"
        class="input"
        bind:value={description}
        placeholder="Fasilitas, akses, atau catatan operasional"></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (open = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="property-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
