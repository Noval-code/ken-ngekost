<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api } from '#lib/api.js';
  import { timeAgo, notificationColor } from '#lib/format.js';
  import { notificationStore } from '#lib/notifications.svelte.js';
  import { toasts } from '#lib/toast.svelte.js';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import Pagination from '#lib/components/Pagination.svelte';
  import EmptyState from '#lib/components/EmptyState.svelte';
  import {
    AlertCircle,
    Bell,
    CheckCheck,
    Clock,
    FileX,
    Landmark,
    ReceiptText,
    Wallet,
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let markingAll = $state(false);

  const iconMap: Record<string, typeof Bell> = {
    invoice_issued: ReceiptText,
    payment_received: Wallet,
    invoice_overdue: AlertCircle,
    lease_expiring: Clock,
    lease_ended: FileX,
    deposit_received: Landmark,
    deposit_refunded: Landmark,
    system: Bell,
  };

  function getIcon(type: string) {
    return iconMap[type] ?? Bell;
  }

  async function markAsRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      notificationStore.decrement();
      await invalidateAll();
    } catch {
      toasts.error('Gagal menandai notifikasi.');
    }
  }

  async function markAllRead() {
    markingAll = true;
    try {
      await notificationStore.markAllRead();
      await invalidateAll();
      toasts.success('Semua notifikasi ditandai sudah dibaca.');
    } catch {
      toasts.error('Gagal menandai semua notifikasi.');
    } finally {
      markingAll = false;
    }
  }

  function handlePageChange(newPage: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(newPage));
    goto(url.pathname + url.search);
  }
</script>

<svelte:head><title>Notifikasi · Panggora</title></svelte:head>

<PageHeader
  eyebrow="Pusat informasi"
  title="Notifikasi"
  subtitle="Perkembangan terbaru tentang tagihan, pembayaran, dan kontrak."
>
  {#snippet actions()}
    <form method="get" class="flex items-center gap-2">
      <select
        class="select h-9 w-auto min-w-32 text-xs"
        name="unreadOnly"
        onchange={(e) => (e.currentTarget.form as HTMLFormElement).submit()}
      >
        <option value="false" selected={data.filter.unreadOnly === 'false'}>Semua notifikasi</option
        >
        <option value="true" selected={data.filter.unreadOnly === 'true'}>Belum dibaca</option>
      </select>
    </form>
    <button class="btn-secondary btn-sm" onclick={markAllRead} disabled={markingAll}>
      <CheckCheck size={15} />
      {markingAll ? 'Memproses...' : 'Tandai semua dibaca'}
    </button>
  {/snippet}
</PageHeader>

<div class="app-card">
  {#if data.notifications.length === 0}
    <EmptyState
      title="Tidak ada notifikasi"
      description={data.filter.unreadOnly === 'true'
        ? 'Semua notifikasi sudah dibaca.'
        : 'Belum ada notifikasi. Notifikasi akan muncul saat ada aktivitas baru.'}
    >
      {#snippet action()}
        {#if data.filter.unreadOnly === 'true'}
          <a class="btn-secondary btn-sm" href="/notifications">Lihat semua</a>
        {/if}
      {/snippet}
    </EmptyState>
  {:else}
    <ul class="divide-y divide-line">
      {#each data.notifications as notification (notification.id)}
        {@const Icon = getIcon(notification.type)}
        {@const isUnread = !notification.readAt}
        <li>
          <div
            class="flex items-start gap-3 px-4 py-4 transition-colors {isUnread
              ? 'bg-accent-soft/25'
              : ''}"
          >
            <span
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full {isUnread
                ? 'bg-accent-soft'
                : 'bg-paper'} {notificationColor(notification.type)}"
            >
              <Icon size={16} />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold {isUnread ? 'text-ink' : 'text-muted'}">
                    {notification.title}
                  </p>
                  <p class="mt-0.5 text-sm text-muted">{notification.message}</p>
                </div>
                <div class="flex shrink-0 items-center gap-1.5">
                  <span class="text-[11px] text-muted">{timeAgo(notification.createdAt)}</span>
                  {#if isUnread}
                    <span class="size-2 rounded-full bg-accent"></span>
                  {/if}
                </div>
              </div>
              <div class="mt-2.5 flex items-center gap-3">
                {#if notification.linkUrl}
                  <a
                    class="text-xs font-semibold text-accent hover:underline"
                    href={notification.linkUrl}
                  >
                    Lihat detail →
                  </a>
                {/if}
                {#if isUnread}
                  <button
                    class="text-xs font-medium text-muted hover:text-ink cursor-pointer"
                    onclick={() => markAsRead(notification.id)}
                  >
                    Tandai dibaca
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </li>
      {/each}
    </ul>
    {#if data.pagination.totalPages > 1}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        total={data.pagination.total}
        onchange={handlePageChange}
      />
    {/if}
  {/if}
</div>
