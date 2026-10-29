<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { formatIndonesianDate, initials, statusLabel } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import { Building2, LoaderCircle, Pencil, Plus, ShieldCheck, UsersRound } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const role = $derived(data.me.membership.role);
  const isOwner = $derived(role === 'owner');
  const isAdmin = $derived(role === 'owner' || role === 'admin');

  let orgOpen = $state(false);
  let memberOpen = $state(false);
  let editMemberOpen = $state(false);
  let saving = $state(false);

  let orgName = $state(data.me.organization.name);
  let orgAddress = $state(data.me.organization.address ?? '');
  let orgPhone = $state(data.me.organization.phone ?? '');
  let orgEmail = $state(data.me.organization.email ?? '');

  let memberName = $state('');
  let memberEmail = $state('');
  let memberPassword = $state('');
  let memberRole = $state('admin');
  let memberPropertyIds = $state<string[]>([]);

  let editingMemberId = $state('');
  let editRole = $state('admin');
  let editStatus = $state('active');
  let editPropertyIds = $state<string[]>([]);

  function openOrg() {
    orgName = data.me.organization.name;
    orgAddress = data.me.organization.address ?? '';
    orgPhone = data.me.organization.phone ?? '';
    orgEmail = data.me.organization.email ?? '';
    orgOpen = true;
  }

  function openEditMember(member: PageData['members'][number]) {
    editingMemberId = member.id;
    editRole = member.role;
    editStatus = member.status;
    editPropertyIds = [...member.propertyIds];
    editMemberOpen = true;
  }

  async function saveOrg(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/organizations', {
        method: 'PATCH',
        body: {
          name: orgName,
          address: orgAddress || undefined,
          phone: orgPhone || undefined,
          email: orgEmail || '',
        },
      });
      toasts.success('Organisasi diperbarui.');
      orgOpen = false;
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal memperbarui organisasi.');
    } finally {
      saving = false;
    }
  }

  async function createMember(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api('/members', {
        body: {
          name: memberName,
          email: memberEmail,
          password: memberPassword,
          role: memberRole,
          propertyIds: memberRole === 'manager' ? memberPropertyIds : [],
        },
      });
      toasts.success('Anggota ditambahkan.');
      memberOpen = false;
      memberName = '';
      memberEmail = '';
      memberPassword = '';
      memberRole = 'admin';
      memberPropertyIds = [];
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal menambah anggota.');
    } finally {
      saving = false;
    }
  }

  async function saveMember(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    try {
      await api(`/members/${editingMemberId}`, {
        method: 'PATCH',
        body: {
          role: editRole,
          status: editStatus,
          propertyIds: editRole === 'manager' ? editPropertyIds : [],
        },
      });
      toasts.success('Anggota diperbarui.');
      editMemberOpen = false;
      window.location.reload();
    } catch (error) {
      toasts.error(error instanceof ApiError ? error.message : 'Gagal memperbarui anggota.');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Pengaturan · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Sistem"
  title="Pengaturan"
  subtitle="Profil organisasi, anggota, dan akses properti."
/>

<div class="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
  <section class="app-card card-pad">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="section-title">Organisasi</h2>
        <p class="mt-1 text-xs text-muted">Data ini muncul pada laporan dan operasional.</p>
      </div>
      {#if isOwner}<button class="btn-secondary btn-sm" onclick={openOrg}
          ><Pencil size={14} /> Edit</button
        >{/if}
    </div>
    <div class="mt-4 flex items-center gap-3 rounded-xl bg-paper p-3">
      <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
        ><Building2 size={19} /></span
      >
      <div>
        <p class="font-bold">{data.me.organization.name}</p>
        <p class="text-xs text-muted">{data.me.organization.email || 'Belum ada email'}</p>
      </div>
    </div>
    <dl class="mt-4 space-y-3 text-sm">
      <div>
        <dt class="text-xs text-muted">Alamat</dt>
        <dd class="mt-0.5">{data.me.organization.address || '—'}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Telepon</dt>
        <dd class="mt-0.5">{data.me.organization.phone || '—'}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Peran Anda</dt>
        <dd class="mt-0.5 flex items-center gap-1.5 font-medium">
          <ShieldCheck size={14} class="text-accent" />
          {statusLabel(role)}
        </dd>
      </div>
    </dl>
  </section>

  <section class="app-card">
    <div class="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
      <div>
        <h2 class="section-title flex items-center gap-2"><UsersRound size={17} /> Anggota</h2>
        <p class="mt-0.5 text-xs text-muted">
          Admin mengelola seluruh properti. Pengelola hanya properti yang ditugaskan.
        </p>
      </div>
      {#if isOwner}<button class="btn-primary btn-sm" onclick={() => (memberOpen = true)}
          ><Plus size={15} /> Anggota</button
        >{/if}
    </div>

    {#if !isAdmin}
      <EmptyState
        title="Akses terbatas"
        description="Hanya owner dan admin yang dapat melihat daftar anggota."
      />
    {:else if data.members.length === 0}
      <EmptyState
        title="Belum ada anggota"
        description="Owner dapat menambahkan admin atau pengelola properti."
      />
    {:else}
      <ul class="divide-y divide-line">
        {#each data.members as member (member.id)}
          <li class="flex items-start gap-3 px-4 py-3.5">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-bold text-muted"
              >{initials(member.name)}</span
            >
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="truncate text-sm font-semibold">
                    {member.name}{#if member.userId === data.me.user.id}
                      <span class="font-normal text-muted">(Anda)</span>{/if}
                  </p>
                  <p class="truncate text-xs text-muted">{member.email}</p>
                </div>
                <StatusBadge status={member.status} />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span class="badge-gray">{statusLabel(member.role)}</span>
                {#if member.role === 'manager'}
                  <span class="text-muted">{member.propertyIds.length} properti</span>
                {/if}
                <span class="text-muted"
                  >· sejak {formatIndonesianDate(member.createdAt.slice(0, 10))}</span
                >
              </div>
            </div>
            {#if isOwner && member.role !== 'owner'}
              <button
                class="shrink-0 text-xs font-semibold text-accent"
                onclick={() => openEditMember(member)}>Edit</button
              >
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<Modal open={orgOpen} title="Edit organisasi" onclose={() => (orgOpen = false)}>
  <form id="org-form" class="space-y-4" onsubmit={saveOrg}>
    <div class="field">
      <label class="label" for="orgName">Nama organisasi</label>
      <input id="orgName" class="input" bind:value={orgName} required />
    </div>
    <div class="field">
      <label class="label" for="orgAddress">Alamat</label>
      <textarea id="orgAddress" class="input" bind:value={orgAddress}></textarea>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="field">
        <label class="label" for="orgPhone">Telepon</label>
        <input id="orgPhone" class="input" type="tel" bind:value={orgPhone} />
      </div>
      <div class="field">
        <label class="label" for="orgEmail">Email</label>
        <input id="orgEmail" class="input" type="email" bind:value={orgEmail} />
      </div>
    </div>
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (orgOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="org-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>

<Modal
  open={memberOpen}
  title="Anggota baru"
  description="Buat akun dan tentukan akses properti."
  onclose={() => (memberOpen = false)}
>
  <form id="member-form" class="space-y-4" onsubmit={createMember}>
    <div class="field">
      <label class="label" for="memberName">Nama</label>
      <input id="memberName" class="input" bind:value={memberName} required />
    </div>
    <div class="field">
      <label class="label" for="memberEmail">Email</label>
      <input id="memberEmail" class="input" type="email" bind:value={memberEmail} required />
    </div>
    <div class="field">
      <label class="label" for="memberPassword">Kata sandi awal</label>
      <input
        id="memberPassword"
        class="input"
        type="password"
        minlength="8"
        bind:value={memberPassword}
        required
      />
      <p class="hint">Minimal 8 karakter. Sampaikan kepada anggota melalui saluran aman.</p>
    </div>
    <div class="field">
      <label class="label" for="memberRole">Peran</label>
      <select id="memberRole" class="select" bind:value={memberRole}>
        <option value="admin">Admin</option>
        <option value="manager">Pengelola</option>
      </select>
    </div>
    {#if memberRole === 'manager'}
      <fieldset class="field">
        <legend class="label">Properti yang dikelola</legend>
        <div class="space-y-2 rounded-xl border border-line p-3">
          {#each data.properties as property (property.id)}
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" value={property.id} bind:group={memberPropertyIds} />
              {property.name}
            </label>
          {:else}
            <p class="text-xs text-muted">Belum ada properti.</p>
          {/each}
        </div>
      </fieldset>
    {/if}
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (memberOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="member-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Tambah
      </button>
    </div>
  {/snippet}
</Modal>

<Modal open={editMemberOpen} title="Edit anggota" onclose={() => (editMemberOpen = false)}>
  <form id="edit-member-form" class="space-y-4" onsubmit={saveMember}>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="field">
        <label class="label" for="editRole">Peran</label>
        <select id="editRole" class="select" bind:value={editRole}>
          <option value="admin">Admin</option>
          <option value="manager">Pengelola</option>
        </select>
      </div>
      <div class="field">
        <label class="label" for="editStatus">Status</label>
        <select id="editStatus" class="select" bind:value={editStatus}>
          <option value="active">Aktif</option>
          <option value="suspended">Ditangguhkan</option>
        </select>
      </div>
    </div>
    {#if editRole === 'manager'}
      <fieldset class="field">
        <legend class="label">Properti yang dikelola</legend>
        <div class="space-y-2 rounded-xl border border-line p-3">
          {#each data.properties as property (property.id)}
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" value={property.id} bind:group={editPropertyIds} />
              {property.name}
            </label>
          {/each}
        </div>
      </fieldset>
    {/if}
  </form>
  {#snippet footer()}
    <div class="flex gap-2">
      <button class="btn-secondary flex-1" type="button" onclick={() => (editMemberOpen = false)}
        >Batal</button
      >
      <button class="btn-primary flex-1" type="submit" form="edit-member-form" disabled={saving}>
        {#if saving}<LoaderCircle size={17} class="animate-spin" />{/if} Simpan
      </button>
    </div>
  {/snippet}
</Modal>
