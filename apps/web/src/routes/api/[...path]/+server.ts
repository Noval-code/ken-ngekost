import { API_BASE_URL } from '$app/env/private';
import type { RequestHandler } from './$types';

const FORWARDED_HEADERS = [
  'content-type',
  'cookie',
  'origin',
  'x-organization-id',
  'authorization',
];

export const fallback: RequestHandler = async ({ request, params, url }) => {
  const base = API_BASE_URL;
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const target = `${base}/api/${params.path}${url.search}`;
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: 'API_UNAVAILABLE', message: 'Layanan sedang tidak dapat dihubungi.' },
      }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const outHeaders = new Headers(response.headers);
  outHeaders.delete('content-encoding');
  outHeaders.delete('content-length');

  const setCookies =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    outHeaders.delete('set-cookie');
    for (const cookie of setCookies) outHeaders.append('set-cookie', cookie);
  }

  return new Response(response.body, {
    status: response.status,
    headers: outHeaders,
  });
};
