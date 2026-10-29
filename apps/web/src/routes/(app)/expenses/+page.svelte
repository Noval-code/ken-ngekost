<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { formatIdr, formatIndonesianDate } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { LoaderCircle, Pencil, Plus, Tags } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const today = new Date().toISOString().slice(0, 10);
  let open = $state(false);
  let categoryOpen = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);

  let propertyId = $state(data.filter.propertyId || data.properties[0]?.id || '');
  let categoryId = $state(data.filter.categoryId || data.categories[0]?.id || '');
  let amount = $state('');
  let expenseDate = $state(today);
  let description = $state('');
  let newCategory = $state('');

  function openNew() {
    editingId = null;
    propertyId = data.filter.propertyId || data.properties[0]?.id || '';
    categoryId = data.filter.categoryId || data.categories[0]?.id || '';
    amount = '';
    expenseDate = today;
    description = '';
    open = true;
  }

  function openEdit(expense: PageData['expenses'][number]) {
    editingId = expense.id;
    propertyId = expense.propertyId;
    categoryId = expense.categoryId;
    amount = expense.amount.replace(/\.00$/, '');
    expenseDate = expense.expenseDate;
    description = expense.description;
    open = true;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      const body = {
        propertyId,
        categoryId,
        amount: Number(amount).toFixed(2),
        expenseDate,
        description,
      };
      if (editingId) {
        await api(`/expenses/${editingId}`, { method: 'PATCH', body });
        toasts.success('Pengeluaran diperbarui.');
      } else {
        await api('/expenses', { body });
        toasts.success('Pengeluaran dicatat.');
      }
      open = false;
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menyimpan pengeluaran.');
    } finally {
      saving = false;
    }
  }

  async function addCategory(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/expenses/categories', { body: { name: newCategory } });
      toasts.success('Kategori ditambahkan.');
      categoryOpen = false;
      newCategory = '';
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menambah kategori.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Pengeluaran · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Keuangan"
  title="Pengeluaran"
  subtitle="Catat biaya operasional per properti dan kategori."
>
  {#snippet actions()}
    <button class="btn-secondary btn-sm" onclick={() => (categoryOpen = true)}
      ><Tags size={15} /> Kategori</button
    >
    <button
      class="btn-primary btn-sm"
      onclick={openNew}
      disabled={data.properties.length === 0 || data.categories.length === 0}
      ><Plus size={16} /> Pengeluaran</button
    >
  {/snippet}
</PageHeader>

<form class="app-card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]" method="get">
  <select class="select" name="propertyId" value={data.filter.propertyId}>
    <option value="">Semua properti</option>
    {#each data.properties as property (property.id)}<option value={property.id}
        >{property.name}</option
      >{/each}
  </select>
  <select class="select" name="categoryId" value={data.filter.categoryId}>
    <option value="">Semua kategori</option>
    {#each data.categories as category (category.id)}<option value={category.id}
        >{category.name}</option
      >{/each}
  </select>
  <input
    class="input sm:w-38"
    type="date"
    name="from"
    value={data.filter.from}
    aria-label="Dari tanggal"
  />
  <input
    class="input sm:w-38"
    type="date"
    name="to"
    value={data.filter.to}
    aria-label="Sampai tanggal"
  />
  <button class="btn-secondary" type="submit">Filter</button>
</form>

<div
  class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white"
>
  <span class="text-sm font-medium">Total pengeluaran ditampilkan</span>
  <p class="text-xl font-bold tabular-nums">{formatIdr(data.summary.totalAmount)}</p>
</div>

{#if data.properties.length === 0 || data.categories.length === 0}
  <div class="app-card">
    <EmptyState
      title={data.properties.length === 0 ? 'Belum ada properti' : 'Belum ada kategori'}
      description={data.properties.length === 0
        ? 'Tambahkan properti terlebih dahulu.'
        : 'Buat kategori seperti listrik, air, kebersihan, atau perbaikan.'}
    >
      {#snippet action()}
        {#if data.properties.length === 0}
          <a class="btn-primary btn-sm" href="/properties">Buka properti</a>
        {:else}
          <button class="btn-primary btn-sm" onclick={() => (categoryOpen = true)}
            ><Plus size={16} /> Buat kategori</button
          >
        {/if}
      {/snippet}
    </EmptyState>
  </div>
{:else if data.expenses.length === 0}
  <div class="app-card">
    <EmptyState
      title="Belum ada pengeluaran"
      description="Pengeluaran yang dicatat akan muncul di laporan arus kas."
    >
      {#snippet action()}<button class="btn-primary btn-sm" onclick={openNew}
          ><Plus size={16} /> Catat sekarang</button
        >{/snippet}
    </EmptyState>
  </div>
{:else}
  <div class="app-card overflow-hidden">
    <div class="hidden table-wrap sm:block">
      <table class="data-table">
        <thead
          ><tr
            ><th>Tanggal</th><th>Properti</th><th>Kategori</th><th>Deskripsi</th><th>Nominal</th><th
            ></th></tr
          ></thead
        >
        <tbody>
          {#each data.expenses as expense (expense.id)}
            <tr>
              <td>{formatIndonesianDate(expense.expenseDate)}</td>
              <td class="text-muted">{expense.propertyName}</td>
              <td><span class="badge-gray">{expense.categoryName}</span></td>
              <td class="max-w-64 truncate">{expense.description}</td>
              <td class="font-semibold tabular-nums">{formatIdr(expense.amount)}</td>
              <td class="text-right"
                ><button class="text-xs font-semibold text-accent" onclick={() => openEdit(expense)}
                  >Edit</button
                ></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="divide-y divide-line sm:hidden">
      {#each data.expenses as expense (expense.id)}
        <button
          class="flex w-full items-start justify-between gap-3 p-4 text-left"
          onclick={() => openEdit(expense)}
        >
          <div>
            <p class="text-sm font-semibold">{expense.description}</p>
            <p class="mt-0.5 text-xs text-muted">{expense.categoryName} · {expense.propertyName}</p>
            <p class="text-xs text-muted">{formatIndonesianDate(expense.expenseDate)}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="text-sm font-bold tabular-nums">{formatIdr(expense.amount)}</span>
            <Pencil size={14} class="text-muted" />
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}

<Modal
  {open}
  title={editingId ? 'Edit pengeluaran' : 'Pengeluaran baru'}
  onclose={() => (open = false)}
>
  <form id="expense-form" class="space-y-4" onsubmit={submit}>
    <div class="field">
      <label class="label" for="property">Properti</label>
      <select id="property" class="select" bind:value={propertyId} required>
        {#each data.properties as property (property.id)}<option value={property.id}
            >{property.name}</option
          >{/each}
      </select>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="field">
        <label class="label" for="category">Kategori</label>
        <select id="category" class="select" bind:value={categoryId} required>
          {#each data.categories as category (category.id)}<option value={category.id}
              >{category.name}</option
            >{/each}
        </select>
      </div>
      <div class="field">
        <label class="label" for="date">Tanggal</label>
        <input id="date" class="input" type="date" bind:value={expenseDate} required />
      </div>
    </div>
    <div class="field">
      <label class="label" for="amount">Nominal</label>
      <input
        id="amount"
        class="input"
        type="number"
        min="0.01"
        step="0.01"
        bind:value={amount}
        required
      />
    </div>
    <div class="field">
      <label class="label" for="description">Deskripsi</label>
      <textarea
        id="description"
        class="input"
        bind:value={description}
        required
        placeholder="Contoh: token listrik area bersama"></textarea>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (open = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="expense-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>

<Modal
  open={categoryOpen}
  title="Kategori pengeluaran"
  description="Kategori baru untuk seluruh properti."
  onclose={() => (categoryOpen = false)}
>
  <form id="category-form" class="space-y-4" onsubmit={addCategory}>
    <div class="field">
      <label class="label" for="categoryName">Nama kategori</label>
      <input
        id="categoryName"
        class="input"
        bind:value={newCategory}
        required
        placeholder="Contoh: Perawatan"
      />
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (categoryOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="category-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
