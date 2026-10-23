import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PropertyRow, Report } from '#lib/types.js';
import type { PageServerLoad } from './$types';

function monthBounds() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const load: PageServerLoad = async (event) => {
  const defaults = monthBounds();
  const from = event.url.searchParams.get('from') || defaults.from;
  const to = event.url.searchParams.get('to') || defaults.to;
  const propertyId = event.url.searchParams.get('propertyId') || '';

  const params = new URLSearchParams({ from, to });
  if (propertyId) params.set('propertyId', propertyId);

  const [report, properties] = await Promise.all([
    serverApi<{ data: Report }>(event, `/api/reports?${params.toString()}`),
    serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100'),
  ]);

  if (!report.ok) error(report.status || 500, report.error?.message ?? 'Gagal memuat laporan.');

  return {
    report: report.data!.data,
    properties: properties.ok ? properties.data!.data : [],
    filter: { from, to, propertyId },
  };
};
