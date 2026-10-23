<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { api, setOrganizationCookie } from '#lib/api.js';
  import { initials } from '#lib/format.js';
  import { toasts } from '#lib/toast.svelte.js';
  import Modal from '#lib/components/Modal.svelte';
  import {
    BarChart3,
    Building2,
    DoorOpen,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    ReceiptText,
    Settings,
    Users,
    Wallet,
    X,
    Landmark,
  } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: import('./$types').LayoutData; children: Snippet } = $props();
  let moreOpen = $state(false);
  let orgOpen = $state(false);
  let loggingOut = $state(false);

  const primaryNav = [
    { href: '/', label: 'Beranda', icon: LayoutDashboard },
    { href: '/rooms', label: 'Kamar', icon: DoorOpen },
    { href: '/invoices', label: 'Tagihan', icon: ReceiptText },
    { href: '/payments', label: 'Pembayaran', icon: Wallet },
  ];

  const secondaryNav = [
    { href: '/properties', label: 'Properti', icon: Building2 },
    { href: '/tenants', label: 'Penghuni', icon: Users },
    { href: '/leases', label: 'Kontrak', icon: FileText },
    { href: '/deposits', label: 'Deposit', icon: Landmark },
    { href: '/expenses', label: 'Pengeluaran', icon: ReceiptText },
    { href: '/reports', label: 'Laporan', icon: BarChart3 },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ];

  const allNav = [...primaryNav, ...secondaryNav];

  function isActive(href: string) {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
  }

  async function logout() {
    loggingOut = true;
    try {
      await api('/auth/sign-out', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      toasts.error('Gagal keluar. Coba lagi.');
      loggingOut = false;
    }
  }

  async function switchOrganization(id: string) {
    setOrganizationCookie(id);
    orgOpen = false;
    await invalidateAll();
  }
</script>

<svelte:head><title>{data.me.organization.name} - Ken Ngekost</title></svelte:head>

<div class="min-h-dvh lg:flex">
  <aside class="hidden w-[264px] shrink-0 border-r border-line bg-surface/85 lg:flex lg:flex-col">
    <div class="px-5 pb-4 pt-6">
      <a href="/" class="flex items-center gap-3">
        <span
          class="flex size-10 items-center justify-center rounded-xl bg-accent text-lg font-black text-white"
          >K</span
        >
        <span>
          <span class="block text-[15px] font-bold leading-tight">Ken Ngekost</span>
          <span class="block text-[11px] text-muted">{data.me.organization.name}</span>
        </span>
      </a>
    </div>

    <div class="mx-4 mb-4 rounded-xl border border-line bg-paper/70 p-3">
      <button class="flex w-full items-center gap-3 text-left" onclick={() => (orgOpen = true)}>
        <span
          class="flex size-9 items-center justify-center rounded-lg bg-white text-xs font-bold text-accent shadow-sm"
        >
          {initials(data.me.organization.name)}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold">{data.me.organization.name}</span>
          <span class="block text-[11px] capitalize text-muted">{data.me.membership.role}</span>
        </span>
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
      {#each allNav as item (item.href)}
        <a
          href={item.href}
          class="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors {isActive(
            item.href,
          )
            ? 'bg-accent-soft text-accent-dark'
            : 'text-muted hover:bg-black/5 hover:text-ink'}"
        >
          <item.icon size={18} strokeWidth={isActive(item.href) ? 2.3 : 1.9} />
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="border-t border-line p-3">
      <div class="mb-2 flex items-center gap-2.5 px-2 py-1.5">
        <span
          class="flex size-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark"
        >
          {initials(data.me.user.name)}
        </span>
        <div class="min-w-0">
          <p class="truncate text-xs font-semibold">{data.me.user.name}</p>
          <p class="truncate text-[11px] text-muted">{data.me.user.email}</p>
        </div>
      </div>
      <button class="btn-ghost w-full justify-start btn-sm" onclick={logout} disabled={loggingOut}>
        <LogOut size={16} />
        {loggingOut ? 'Mengakhiri sesi...' : 'Keluar'}
      </button>
    </div>
  </aside>

  <div class="min-w-0 flex-1">
    <header
      class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:hidden"
    >
      <a href="/" class="flex items-center gap-2">
        <span
          class="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-black text-white"
          >K</span
        >
        <span class="text-sm font-bold">Ken Ngekost</span>
      </a>
      <button class="icon-btn -mr-2" onclick={() => (moreOpen = true)} aria-label="Buka menu">
        <Menu size={21} />
      </button>
    </header>

    <main class="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:pb-12 lg:pt-8">
      {@render children()}
    </main>
  </div>
</div>

<nav
  class="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur-md lg:hidden"
  aria-label="Navigasi bawah"
>
  <div class="grid grid-cols-5">
    {#each primaryNav as item (item.href)}
      <a
        href={item.href}
        class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold {isActive(
          item.href,
        )
          ? 'text-accent'
          : 'text-muted'}"
      >
        <item.icon size={21} strokeWidth={isActive(item.href) ? 2.3 : 1.8} />
        {item.label}
      </a>
    {/each}
    <button
      class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold {moreOpen
        ? 'text-accent'
        : 'text-muted'}"
      onclick={() => (moreOpen = true)}
    >
      <Menu size={21} strokeWidth={1.8} />
      Lainnya
    </button>
  </div>
</nav>

{#if moreOpen}
  <div class="fixed inset-0 z-50 lg:hidden">
    <button
      class="absolute inset-0 bg-ink/40"
      aria-label="Tutup menu"
      onclick={() => (moreOpen = false)}
    ></button>
    <div
      class="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl"
    >
      <div class="mb-5 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">
            {data.me.organization.name}
          </p>
          <h2 class="text-xl font-bold">Menu lainnya</h2>
        </div>
        <button class="icon-btn -mr-2" onclick={() => (moreOpen = false)} aria-label="Tutup">
          <X size={20} />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        {#each secondaryNav as item (item.href)}
          <a
            href={item.href}
            onclick={() => (moreOpen = false)}
            class="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-paper/50 px-3 text-sm font-medium"
          >
            <item.icon size={18} class="text-accent" />
            {item.label}
          </a>
        {/each}
      </div>
      <div class="mt-4 flex items-center gap-3 rounded-xl border border-line p-3">
        <span
          class="flex size-10 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark"
        >
          {initials(data.me.user.name)}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{data.me.user.name}</p>
          <p class="truncate text-xs text-muted">{data.me.user.email}</p>
        </div>
        <button class="icon-btn" onclick={logout} aria-label="Keluar"><LogOut size={18} /></button>
      </div>
    </div>
  </div>
{/if}

<Modal open={orgOpen} title="Pilih organisasi" onclose={() => (orgOpen = false)}>
  <div class="space-y-2">
    {#each data.me.memberships as membership (membership.id)}
      <button
        class="flex w-full items-center justify-between rounded-xl border border-line p-3 text-left hover:bg-paper {membership
          .organization.id === data.me.organization.id
          ? 'border-accent bg-accent-soft/50'
          : ''}"
        onclick={() => switchOrganization(membership.organization.id)}
      >
        <span>
          <span class="block text-sm font-semibold">{membership.organization.name}</span>
          <span class="block text-xs capitalize text-muted">{membership.role}</span>
        </span>
        {#if membership.organization.id === data.me.organization.id}
          <span class="badge-green">Aktif</span>
        {/if}
      </button>
    {/each}
  </div>
</Modal>
