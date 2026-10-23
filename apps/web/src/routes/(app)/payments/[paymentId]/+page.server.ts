import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      paymentNumber: string;
      amount: string;
      method: string;
      paidAt: string;
      reference: string | null;
      notes: string | null;
      status: string;
      voidReason: string | null;
      voidedAt: string | null;
      createdAt: string;
      allocations: Array<{
        id: string;
        amount: string;
        invoiceId: string;
        invoiceNumber: string;
        periodStart: string;
        periodEnd: string;
        roomNumber: string;
        propertyName: string;
        tenantName: string;
      }>;
    };
  }>(event, `/api/payments/${event.params.paymentId}`);
  if (!result.ok)
    error(result.status || 500, result.error?.message ?? 'Pembayaran tidak ditemukan.');
  return { payment: result.data!.data };
};
