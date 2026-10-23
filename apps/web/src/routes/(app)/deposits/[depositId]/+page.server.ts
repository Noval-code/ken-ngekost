import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      leaseId: string;
      amountReceived: string;
      amountRefunded: string;
      heldAmount: string;
      status: string;
      notes: string | null;
      propertyId: string;
      propertyName: string;
      roomNumber: string;
      tenantName: string;
      history: Array<{
        id: string;
        type: string;
        amount: string;
        notes: string | null;
        createdAt: string;
      }>;
    };
  }>(event, `/api/deposits/${event.params.depositId}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Deposit tidak ditemukan.');
  return { deposit: result.data!.data };
};
