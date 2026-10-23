import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { InvoiceRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi<{ data: InvoiceRow[] }>(
    event,
    '/api/invoices?pageSize=100&status=all',
  );
  if (!result.ok) error(result.status || 500, result.error?.message ?? 'Gagal memuat tagihan.');

  const outstanding = result.data!.data.filter(
    (invoice) =>
      invoice.derivedStatus !== 'paid' &&
      invoice.derivedStatus !== 'void' &&
      Number(invoice.balance) > 0,
  );
  const preselectedInvoiceId = event.url.searchParams.get('invoiceId') ?? '';

  if (preselectedInvoiceId && !outstanding.some((invoice) => invoice.id === preselectedInvoiceId)) {
    const detail = await serverApi<{
      data: InvoiceRow & { derivedStatus: InvoiceRow['derivedStatus'] };
    }>(event, `/api/invoices/${preselectedInvoiceId}`);
    if (detail.ok) outstanding.unshift(detail.data!.data);
  }

  return { invoices: outstanding, preselectedInvoiceId };
};
