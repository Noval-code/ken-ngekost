import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { ExpenseRow, PropertyRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const params = new URLSearchParams({ pageSize: '100' });
  for (const key of ['propertyId', 'categoryId', 'from', 'to']) {
    const value = event.url.searchParams.get(key);
    if (value) params.set(key, value);
  }

  const [expenses, properties, categories] = await Promise.all([
    serverApi<{ data: ExpenseRow[]; summary: { totalAmount: string } }>(
      event,
      `/api/expenses?${params.toString()}`,
    ),
    serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100'),
    serverApi<{ data: Array<{ id: string; name: string }> }>(event, '/api/expenses/categories'),
  ]);

  if (!expenses.ok)
    error(expenses.status || 500, expenses.error?.message ?? 'Gagal memuat pengeluaran.');

  return {
    expenses: expenses.data!.data,
    summary: expenses.data!.summary,
    properties: properties.ok ? properties.data!.data : [],
    categories: categories.ok ? categories.data!.data : [],
    filter: {
      propertyId: event.url.searchParams.get('propertyId') ?? '',
      categoryId: event.url.searchParams.get('categoryId') ?? '',
      from: event.url.searchParams.get('from') ?? '',
      to: event.url.searchParams.get('to') ?? '',
    },
  };
};
