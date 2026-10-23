import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PropertyRow, RoomRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams();
  for (const key of ['search', 'status', 'occupancy', 'propertyId', 'page']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  params.set('pageSize', '100');

  const [rooms, properties] = await Promise.all([
    serverApi<{ data: RoomRow[]; pagination: import('#lib/types.js').Pagination }>(
      event,
      `/api/rooms?${params.toString()}`,
    ),
    serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100'),
  ]);

  if (!rooms.ok) error(rooms.status || 500, rooms.error?.message ?? 'Gagal memuat kamar.');

  return {
    rooms: rooms.data!.data,
    pagination: rooms.data!.pagination,
    properties: properties.ok ? properties.data!.data : [],
    filter: {
      search: event.url.searchParams.get('search') ?? '',
      status: event.url.searchParams.get('status') ?? 'all',
      occupancy: event.url.searchParams.get('occupancy') ?? 'all',
      propertyId: event.url.searchParams.get('propertyId') ?? '',
    },
  };
};
