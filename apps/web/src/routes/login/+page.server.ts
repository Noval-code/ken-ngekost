import { redirect } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const result = await serverApi(event, '/api/me');
  if (result.ok) {
    redirect(303, '/');
  }
  return {
    next: event.url.searchParams.get('next') ?? '/',
  };
};
