import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { NotificationRow, Paginated } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const page = event.url.searchParams.get('page') ?? '1';
  const unreadOnly = event.url.searchParams.get('unreadOnly') ?? 'false';
  const search = new URLSearchParams({ page, pageSize: '20', unreadOnly });

  const result = await serverApi<Paginated<NotificationRow>>(
    event,
    `/api/notifications?${search.toString()}`,
  );

  if (!result.ok) {
    error(result.status || 500, result.error?.message ?? 'Gagal memuat notifikasi.');
  }

  return {
    notifications: result.data!.data,
    pagination: result.data!.pagination,
    filter: { unreadOnly },
  };
};
