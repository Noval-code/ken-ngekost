<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { initials } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { LoaderCircle, Phone, Plus, Search } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let open = $state(false);
  let saving = $state(false);
  let name = $state('');
  let phone = $state('');
  let notes = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/tenants', { body: { name, phone, notes: notes || undefined } });
      toasts.success('Penghuni berhasil ditambahkan.');
      open = false;
      name = '';
      phone = '';
      notes = '';
      await invalidateAll();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menyimpan penghuni.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Penghuni · Ken Ngekost</title></svelte:head>

<PageHeader
  eyebrow="Orang"
  title="Penghuni"
  subtitle="Data penghuni dan kamar yang sedang mereka tempati."
>
  {#snippet actions()}
    <button class="btn-primary btn-sm" onclick={() => (open = true)}
      ><Plus size={16} /> Penghuni baru</button
    >
  {/snippet}
</PageHeader>

<form class="app-card mb-4 flex gap-2 p-3" method="get">
  <div class="relative flex-1">
    <Search size={17} class="pointer-events-none absolute left-3 top-0 mt-3 text-muted" />
    <input
      class="input pl-9"
      name="search"
      value={data.search}
      placeholder="Cari nama atau nomor telepon"
    />
  </div>
  <button class="btn-secondary" type="submit">Cari</button>
</form>

{#if data.tenants.length === 0}
  <div class="app-card">
    <EmptyState
      title={data.search ? 'Penghuni tidak ditemukan' : 'Belum ada penghuni'}
      description={data.search
        ? 'Coba kata kunci lain.'
        : 'Tambahkan penghuni sebelum membuat kontrak sewa.'}
    >
      {#snippet action()}
        <button class="btn-primary btn-sm" onclick={() => (open = true)}
          ><Plus size={16} /> Tambah penghuni</button
        >
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {#each data.tenants as tenant (tenant.id)}
      <a
        class="app-card flex items-start gap-3 p-4 hover:border-accent/30"
        href="/tenants/{tenant.id}"
      >
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark"
        >
          {initials(tenant.name)}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{tenant.name}</p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <Phone size={12} />
            {tenant.phone}
          </p>
          <div class="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span class="text-xs text-muted"
              >{tenant.activeProperty ?? 'Belum menempati kamar'}</span
            >
            {#if tenant.activeRoom}<span class="badge-green">{tenant.activeRoom}</span>{/if}
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}

<Modal
  {open}
  title="Penghuni baru"
  description="Cukup data yang dibutuhkan operasional."
  onclose={() => (open = false)}
>
  <form id="tenant-form" class="space-y-4" onsubmit={submit}>
    <div class="field">
      <label class="label" for="name">Nama lengkap</label>
      <input id="name" class="input" bind:value={name} required placeholder="Nama penghuni" />
    </div>
    <div class="field">
      <label class="label" for="phone">Nomor telepon</label>
      <input id="phone" class="input" type="tel" bind:value={phone} required placeholder="0812…" />
    </div>
    <div class="field">
      <label class="label" for="notes"
        >Catatan <span class="font-normal text-muted">(opsional)</span></label
      >
      <textarea
        id="notes"
        class="input"
        bind:value={notes}
        placeholder="Kontak darurat, preferensi, atau catatan lain"></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (open = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="tenant-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
