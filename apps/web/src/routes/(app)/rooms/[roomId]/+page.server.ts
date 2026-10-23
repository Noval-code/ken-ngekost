import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      propertyId: string;
      propertyName: string;
      roomNumber: string;
      baseRent: string;
      operationalStatus: string;
      description: string | null;
      leases: Array<{
        lease: {
          id: string;
          status: string;
          startDate: string;
          endDate: string;
          rentAmount: string;
        };
        tenantName: string;
        tenantPhone: string;
      }>;
    };
  }>(event, `/api/rooms/${event.params.roomId}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Kamar tidak ditemukan.');
  return { room: result.data!.data };
};
