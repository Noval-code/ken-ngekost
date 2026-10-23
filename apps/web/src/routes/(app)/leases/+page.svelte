<script lang="ts">
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { FilePlus2, Search } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Kontrak · Ken Ngekost</title></svelte:head>

<PageHeader
  eyebrow="Sewa"
  title="Kontrak"
  subtitle="Kontrak aktif, akan berakhir, dan riwayat sewa penghuni."
>
  {#snippet actions()}
    <a class="btn-primary btn-sm" href="/leases/new"><FilePlus2 size={16} /> Kontrak baru</a>
  {/snippet}
</PageHeader>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]" method="get">
  <div class="relative">
    <Search size={17} class="pointer-events-none absolute left-3 top-0 mt-3 text-muted" />
    <input
      class="input pl-9"
      name="search"
      value={data.filter.search}
      placeholder="Cari nama penghuni atau kamar"
    />
  </div>
  <select class="select sm:w-44" name="status" value={data.filter.status}>
    <option value="active">Aktif</option>
    <option value="ended">Selesai</option>
    <option value="cancelled">Dibatalkan</option>
    <option value="all">Semua</option>
  </select>
  <button class="btn-secondary" type="submit">Filter</button>
</form>

{#if data.leases.length === 0}
  <div class="app-card">
    <EmptyState
      title="Tidak ada kontrak"
      description="Kontrak baru akan mengaktifkan kamar dan membuat tagihan pertama."
    >
      {#snippet action()}<a class="btn-primary btn-sm" href="/leases/new"
          ><FilePlus2 size={16} /> Buat kontrak</a
        >{/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Penghuni</th><th>Kamar</th><th>Periode</th><th>Sewa</th><th>Deposit</th><th
              >Status</th
            ><th></th></tr
          ></thead
        >
        <tbody>
          {#each data.leases as row (row.id)}
            <tr>
              <td>
                <p class="font-semibold">{row.tenantName}</p>
                <p class="text-xs text-muted">{row.tenantPhone}</p>
              </td>
              <td>{row.propertyName} · <span class="font-medium">{row.roomNumber}</span></td>
              <td class="text-muted"
                >{formatIndonesianDate(row.startDate)} – {formatIndonesianDate(row.endDate)}</td
              >
              <td class="font-semibold tabular-nums">{formatIdr(row.rentAmount)}</td>
              <td class="tabular-nums">{formatIdr(row.depositAmount)}</td>
              <td><StatusBadge status={row.status} /></td>
              <td class="text-right"
                ><a class="text-xs font-semibold text-accent" href="/leases/{row.id}">Detail</a></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.leases as row (row.id)}
        <a class="block p-4" href="/leases/{row.id}">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-bold">{row.tenantName}</p>
              <p class="text-xs text-muted">{row.propertyName} · {row.roomNumber}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
            <span class="text-muted"
              >{formatIndonesianDate(row.startDate)} – {formatIndonesianDate(row.endDate)}</span
            >
            <span class="font-bold">{formatIdr(row.rentAmount)}</span>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}
