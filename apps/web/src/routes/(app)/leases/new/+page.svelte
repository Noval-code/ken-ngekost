<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError } from '#lib/api.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { ArrowLeft, LoaderCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date();
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  nextYear.setUTCDate(nextYear.getUTCDate() - 1);

  let roomId = $state(data.preselectedRoomId || '');
  let tenantId = $state(data.preselectedTenantId || '');
  let startDate = $state(today);
  let endDate = $state(nextYear.toISOString().slice(0, 10));
  let rentAmount = $state('');
  let depositAmount = $state('');
  let notes = $state('');
  let saving = $state(false);

  const selectedRoom = $derived(data.rooms.find((room) => room.id === roomId));
  const selectedTenant = $derived(data.tenants.find((tenant) => tenant.id === tenantId));
  const canCreate = $derived(data.rooms.length > 0 && data.tenants.length > 0);

  $effect(() => {
    if (selectedRoom && !rentAmount) rentAmount = selectedRoom.baseRent.replace(/\.00$/, '');
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      const result = await api<{ data: { id: string } }>('/leases', {
        body: {
          roomId,
          tenantId,
          startDate,
          endDate,
          rentAmount: Number(rentAmount).toFixed(2),
          depositAmount: Number(depositAmount || 0).toFixed(2),
          notes: notes || undefined,
        },
      });
      toasts.success('Kontrak aktif dan tagihan pertama dibuat.');
      await goto(`/leases/${result.data.id}`);
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal membuat kontrak.');
      saving = false;
    }
  }
</script>

<svelte:head><title>Kontrak baru · Ken Ngekost</title></svelte:head>

<div class="mb-4">
  <a
    class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    href="/leases"
  >
    <ArrowLeft size={14} /> Kembali ke kontrak
  </a>
</div>

<PageHeader
  eyebrow="Kontrak baru"
  title="Aktifkan sewa"
  subtitle="Kontrak aktif langsung membuat tagihan periode pertama."
/>

{#if !canCreate}
  <div class="app-card">
    <EmptyState
      title={data.rooms.length === 0 ? 'Tidak ada kamar kosong' : 'Belum ada penghuni'}
      description={data.rooms.length === 0
        ? 'Semua kamar terisi atau belum ada kamar aktif.'
        : 'Tambahkan penghuni sebelum membuat kontrak.'}
    >
      {#snippet action()}
        <a class="btn-primary btn-sm" href={data.rooms.length === 0 ? '/rooms' : '/tenants'}>
          {data.rooms.length === 0 ? 'Lihat kamar' : 'Tambah penghuni'}
        </a>
      {/snippet}
    </EmptyState>
  </div>
{:else}
  <form class="grid gap-4 lg:grid-cols-[1.4fr_1fr]" onsubmit={submit}>
    <div class="space-y-4">
      <section class="app-card card-pad space-y-4">
        <h2 class="section-title">Penghuni & kamar</h2>
        <div class="field">
          <label class="label" for="tenant">Penghuni</label>
          <select id="tenant" class="select" bind:value={tenantId} required>
            <option value="" disabled>Pilih penghuni</option>
            {#each data.tenants as tenant (tenant.id)}
              <option value={tenant.id}>{tenant.name} · {tenant.phone}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label class="label" for="room">Kamar kosong</label>
          <select id="room" class="select" bind:value={roomId} required>
            <option value="" disabled>Pilih kamar</option>
            {#each data.rooms as room (room.id)}
              <option value={room.id}
                >{room.propertyName} · {room.roomNumber} · Rp{Number(room.baseRent).toLocaleString(
                  'id-ID',
                )}</option
              >
            {/each}
          </select>
        </div>
      </section>

      <section class="app-card card-pad space-y-4">
        <h2 class="section-title">Periode sewa</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field">
            <label class="label" for="start">Tanggal mulai</label>
            <input id="start" class="input" type="date" bind:value={startDate} required />
          </div>
          <div class="field">
            <label class="label" for="end">Tanggal akhir</label>
            <input
              id="end"
              class="input"
              type="date"
              bind:value={endDate}
              min={startDate}
              required
            />
          </div>
        </div>
        <p class="hint">
          Periode bulanan mengikuti tanggal mulai. Kontrak minimal satu periode penuh; tidak ada
          prorata.
        </p>
      </section>

      <section class="app-card card-pad space-y-4">
        <h2 class="section-title">Nominal</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field">
            <label class="label" for="rent">Sewa / bulan</label>
            <input
              id="rent"
              class="input"
              type="number"
              min="0"
              step="1000"
              bind:value={rentAmount}
              required
            />
          </div>
          <div class="field">
            <label class="label" for="deposit">Deposit</label>
            <input
              id="deposit"
              class="input"
              type="number"
              min="0"
              step="1000"
              bind:value={depositAmount}
              placeholder="0"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="notes">Catatan kontrak</label>
          <textarea
            id="notes"
            class="input"
            bind:value={notes}
            placeholder="Kesepakatan tambahan, fasilitas, atau catatan lain"></textarea>
        </div>
      </section>
    </div>

    <aside class="space-y-3 lg:sticky lg:top-6 lg:self-start">
      <div class="app-card card-pad">
        <h2 class="section-title">Ringkasan</h2>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Penghuni</dt>
            <dd class="text-right font-semibold">{selectedTenant?.name ?? '—'}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Kamar</dt>
            <dd class="text-right font-semibold">
              {selectedRoom ? `${selectedRoom.propertyName} · ${selectedRoom.roomNumber}` : '—'}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sewa</dt>
            <dd class="text-right font-semibold tabular-nums">
              {rentAmount ? `Rp${Number(rentAmount).toLocaleString('id-ID')}` : '—'}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Deposit</dt>
            <dd class="text-right font-semibold tabular-nums">
              {depositAmount ? `Rp${Number(depositAmount).toLocaleString('id-ID')}` : 'Rp0'}
            </dd>
          </div>
        </dl>
        <div class="mt-4 rounded-xl bg-accent-soft p-3 text-xs leading-5 text-accent-dark">
          Setelah disimpan, kamar menjadi terisi, deposit dicatat, dan invoice pertama langsung
          diterbitkan.
        </div>
      </div>
      <button class="btn-primary w-full" type="submit" disabled={saving}>
        {#if saving}<LoaderCircle size={18} class="animate-spin" />{/if} Aktifkan kontrak
      </button>
    </aside>
  </form>
{/if}
