import { API_BASE_URL } from '$app/env/private';
import type { RequestEvent } from '@sveltejs/kit';

function apiBase(): string {
  return API_BASE_URL;
}

export interface ServerApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: { code: string; message: string };
}

export async function serverApi<T>(
  event: RequestEvent,
  path: string,
  init: RequestInit = {},
): Promise<ServerApiResult<T>> {
  const headers = new Headers(init.headers);
  const cookie = event.request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const orgId = event.cookies.get('panggora_org');
  if (orgId) headers.set('x-organization-id', orgId);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return {
      ok: false,
      status: 503,
      data: null,
      error: { code: 'API_UNAVAILABLE', message: 'Layanan sedang tidak dapat dihubungi.' },
    };
  }

  if (response.status === 204) return { ok: true, status: 204, data: null };

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    return {
      ok: false,
      status: response.status,
      data: null,
      error: {
        code: error?.code ?? 'REQUEST_FAILED',
        message: error?.message ?? 'Permintaan gagal.',
      },
    };
  }

  return { ok: true, status: response.status, data: payload as T };
}
