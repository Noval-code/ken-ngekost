import { error, redirect } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { Me } from '#lib/types.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const result = await serverApi<{ data: Me }>(event, '/api/me');

  if (!result.ok) {
    if (result.status === 401 || result.error?.code === 'UNAUTHENTICATED') {
      redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
    }
    if (result.status === 403) {
      redirect(303, '/forbidden');
    }
    error(result.status === 503 ? 503 : 500, result.error?.message ?? 'Gagal memuat sesi.');
  }

  return {
    me: result.data!.data,
  };
};
