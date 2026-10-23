import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PropertyRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100');
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat properti.');
  return { properties: result.data!.data };
};
