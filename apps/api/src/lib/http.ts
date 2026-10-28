import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@panggora/shared';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ZodType } from 'zod';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function fail(status: number, code: string, message: string, details?: unknown): never {
  throw new HTTPException(status as 400, {
    res: new Response(
      JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } }),
      { status, headers: { 'content-type': 'application/json' } },
    ),
  });
}

export async function parseJson<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    fail(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    fail(
      400,
      'VALIDATION_ERROR',
      'Data yang dikirim tidak valid.',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function parseQuery<T>(c: Context, schema: ZodType<T>): T {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(c.req.query())) {
    if (value !== '') query[key] = value;
  }
  const result = schema.safeParse(query);
  if (!result.success) {
    fail(
      400,
      'VALIDATION_ERROR',
      'Parameter query tidak valid.',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function paginationFrom(query: { page?: number; pageSize?: number }) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function noContent(c: Context) {
  return c.body(null, 204);
}
