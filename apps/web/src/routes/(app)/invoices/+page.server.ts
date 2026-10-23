import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { InvoiceRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams({ pageSize: '100' });
  for (const key of ['search', 'status', 'periodStart', 'periodEnd']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const result = await serverApi<{ data: InvoiceRow[] }>(
    event,
    `/api/invoices?${params.toString()}`,
  );
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat tagihan.');
  return {
    invoices: result.data!.data,
    filter: {
      search: event.url.searchParams.get('search') ?? '',
      status: event.url.searchParams.get('status') ?? 'all',
      periodStart: event.url.searchParams.get('periodStart') ?? '',
      periodEnd: event.url.searchParams.get('periodEnd') ?? '',
    },
  };
};
