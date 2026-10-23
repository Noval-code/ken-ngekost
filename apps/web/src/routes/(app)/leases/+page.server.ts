import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { LeaseRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams({ pageSize: '100' });
  for (const key of ['search', 'status']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const result = await serverApi<{ data: LeaseRow[] }>(event, `/api/leases?${params.toString()}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat kontrak.');
  return {
    leases: result.data!.data,
    filter: {
      search: event.url.searchParams.get('search') ?? '',
      status: event.url.searchParams.get('status') ?? 'active',
    },
  };
};
