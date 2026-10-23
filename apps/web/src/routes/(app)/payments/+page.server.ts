import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PaymentRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams({ pageSize: '100' });
  for (const key of ['search', 'method', 'status', 'from', 'to']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const result = await serverApi<{ data: PaymentRow[] }>(
    event,
    `/api/payments?${params.toString()}`,
  );
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat pembayaran.');
  return {
    payments: result.data!.data,
    filter: {
      search: event.url.searchParams.get('search') ?? '',
      method: event.url.searchParams.get('method') ?? 'all',
      status: event.url.searchParams.get('status') ?? 'received',
      from: event.url.searchParams.get('from') ?? '',
      to: event.url.searchParams.get('to') ?? '',
    },
  };
};
