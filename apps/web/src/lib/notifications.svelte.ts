import { api } from '#lib/api.js';

let unreadCount = $state(0);
let loading = $state(false);

export const notificationStore = {
  get unreadCount() {
    return unreadCount;
  },
  get loading() {
    return loading;
  },
  async refresh() {
    try {
      loading = true;
      const result = await api<{ data: { count: number } }>('/notifications/unread-count');
      unreadCount = result.data.count;
    } catch {
      // Silently fail - don't break the UI
    } finally {
      loading = false;
    }
  },
  async markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      if (unreadCount > 0) unreadCount -= 1;
    } catch {
      // ignore
    }
  },
  async markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      unreadCount = 0;
    } catch {
      // ignore
    }
  },
  decrement() {
    if (unreadCount > 0) unreadCount -= 1;
  },
};
