import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PropertyRow, RoomRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const propertyId = event.params.propertyId;
  const [property, rooms] = await Promise.all([
    serverApi<{
      data: PropertyRow & {
        stats: {
          roomCount: number;
          occupiedRooms: number;
          vacantRooms: number;
          occupancyRate: number;
        };
      };
    }>(event, `/api/properties/${propertyId}`),
    serverApi<{ data: RoomRow[] }>(
      event,
      `/api/rooms?propertyId=${propertyId}&pageSize=100&status=all`,
    ),
  ]);

  if (!property.ok)
    error(property.status || 500, property.error?.message ?? 'Properti tidak ditemukan.');
  if (!rooms.ok) error(rooms.status || 500, rooms.error?.message ?? 'Gagal memuat kamar.');

  return {
    property: property.data!.data,
    rooms: rooms.data!.data,
  };
};
