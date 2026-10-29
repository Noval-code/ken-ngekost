import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { DashboardData } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const from = event.url.searchParams.get('from') ?? undefined;
  const to = event.url.searchParams.get('to') ?? undefined;
  const propertyId = event.url.searchParams.get('propertyId') ?? undefined;
  const search = new URLSearchParams();
  if (from) search.set('from', from);
  if (to) search.set('to', to);
  if (propertyId) search.set('propertyId', propertyId);
  const suffix = search.size ? `?${search.toString()}` : '';

  const [dashboard, properties] = await Promise.all([
    serverApi<{ data: DashboardData }>(event, `/api/dashboard${suffix}`),
    serverApi<{ data: import('#lib/types.js').PropertyRow[] }>(
      event,
      '/api/properties?pageSize=100',
    ),
  ]);

  if (!dashboard.ok)
    error(dashboard.status || 500, dashboard.error?.message ?? 'Gagal memuat dashboard.');

  return {
    dashboard: dashboard.data!.data,
    properties: properties.ok ? properties.data!.data : [],
    filter: { from: from ?? '', to: to ?? '', propertyId: propertyId ?? '' },
  };
};
