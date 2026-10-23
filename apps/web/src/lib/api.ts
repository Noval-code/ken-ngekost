export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function organizationId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)kost_org=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setOrganizationCookie(id: string) {
  document.cookie = `kost_org=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers = new Headers();
  const orgId = organizationId();
  if (orgId) headers.set('x-organization-id', orgId);
  if (options.body !== undefined) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(503, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'Permintaan gagal.',
    );
  }

  return payload as T;
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
