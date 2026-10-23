import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { RoomRow, TenantRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const [rooms, tenants] = await Promise.all([
    serverApi<{ data: RoomRow[] }>(event, '/api/rooms?pageSize=100&occupancy=vacant&status=active'),
    serverApi<{ data: TenantRow[] }>(event, '/api/tenants?pageSize=100'),
  ]);

  if (!rooms.ok) error(rooms.status || 500, rooms.error?.message ?? 'Gagal memuat kamar.');
  if (!tenants.ok) error(tenants.status || 500, tenants.error?.message ?? 'Gagal memuat penghuni.');

  return {
    rooms: rooms.data!.data,
    tenants: tenants.data!.data,
    preselectedRoomId: event.url.searchParams.get('roomId') ?? '',
    preselectedTenantId: event.url.searchParams.get('tenantId') ?? '',
  };
};
