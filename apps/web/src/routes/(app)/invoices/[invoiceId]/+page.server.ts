import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      invoiceNumber: string;
      status: string;
      periodStart: string;
      periodEnd: string;
      dueDate: string;
      subtotal: string;
      discountAmount: string;
      totalAmount: string;
      notes: string | null;
      createdAt: string;
      roomId: string;
      roomNumber: string;
      propertyId: string;
      propertyName: string;
      tenantId: string;
      tenantName: string;
      tenantPhone: string;
      paidAmount: string;
      balance: string;
      derivedStatus: string;
      items: Array<{
        id: string;
        itemType: string;
        description: string;
        amount: string;
      }>;
      allocations: Array<{
        id: string;
        amount: string;
        paymentId: string;
        paymentNumber: string;
        paidAt: string;
        method: string;
        reference: string | null;
      }>;
    };
  }>(event, `/api/invoices/${event.params.invoiceId}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Tagihan tidak ditemukan.');
  return { invoice: result.data!.data };
};
