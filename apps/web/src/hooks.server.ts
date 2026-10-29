import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Prevent stale cached pages/data after mutations (e.g. adding a property).
  // Keep static assets cacheable.
  if (!event.url.pathname.startsWith('/_app/')) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  }

  return response;
};
