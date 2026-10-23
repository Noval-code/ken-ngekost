import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { DepositRow, PropertyRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams({ pageSize: '100' });
  for (const key of ['status', 'propertyId']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const [deposits, properties] = await Promise.all([
    serverApi<{ data: DepositRow[] }>(event, `/api/deposits?${params.toString()}`),
    serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100'),
  ]);
  if (!deposits.ok)
    error(deposits.status || 500, deposits.error?.message ?? 'Gagal memuat deposit.');
  return {
    deposits: deposits.data!.data,
    properties: properties.ok ? properties.data!.data : [],
    filter: {
      status: event.url.searchParams.get('status') ?? 'all',
      propertyId: event.url.searchParams.get('propertyId') ?? '',
    },
  };
};
