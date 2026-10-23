import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{
    data: {
      id: string;
      name: string;
      phone: string;
      notes: string | null;
      createdAt: string;
      leases: Array<{
        lease: {
          id: string;
          status: string;
          startDate: string;
          endDate: string;
          rentAmount: string;
          depositAmount: string;
        };
        roomNumber: string;
        propertyId: string;
        propertyName: string;
      }>;
      invoices: Array<{
        invoice: {
          id: string;
          invoiceNumber: string;
          periodStart: string;
          periodEnd: string;
          dueDate: string;
          totalAmount: string;
          status: string;
        };
        roomNumber: string;
      }>;
    };
  }>(event, `/api/tenants/${event.params.tenantId}`);
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Penghuni tidak ditemukan.');
  return { tenant: result.data!.data };
};
