import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { TenantRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const search = event.url.searchParams.get('search') ?? '';
  const result = await serverApi<{ data: TenantRow[] }>(
    event,
    `/api/tenants?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
  );
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat penghuni.');
  return { tenants: result.data!.data, search };
};
