import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      status: string;
      startDate: string;
      endDate: string;
      rentAmount: string;
      depositAmount: string;
      billingAnchorDay: number;
      notes: string | null;
      endedAt: string | null;
      roomId: string;
      roomNumber: string;
      propertyId: string;
      propertyName: string;
      tenantId: string;
      tenantName: string;
      tenantPhone: string;
      invoices: Array<{
        id: string;
        invoiceNumber: string;
        periodStart: string;
        periodEnd: string;
        dueDate: string;
        totalAmount: string;
        status: string;
        paidAmount: string;
        balance: string;
      }>;
      periods: Array<{ startDate: string; endDate: string; dueDate: string }>;
    };
  }>(event, `/api/leases/${event.params.leaseId}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Kontrak tidak ditemukan.');
  return { lease: result.data!.data };
};
