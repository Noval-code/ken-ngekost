import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { requireAuth } from './lib/access';
import { isInvalidTextRepresentation } from './lib/db-errors';
import type { ApiErrorBody } from './lib/http';
import { dashboardRoutes } from './routes/dashboard';
import { depositRoutes } from './routes/deposits';
import { expenseRoutes } from './routes/expenses';
import { healthRoutes } from './routes/health';
import { invoiceRoutes } from './routes/invoices';
import { leaseRoutes } from './routes/leases';
import { meRoutes } from './routes/me';
import { memberRoutes } from './routes/members';
import { notificationRoutes } from './routes/notifications';
import { organizationRoutes } from './routes/organizations';
import { paymentRoutes } from './routes/payments';
import { propertyRoutes } from './routes/properties';
import { reportRoutes } from './routes/reports';
import { roomRoutes } from './routes/rooms';
import { schedulerRoutes } from './routes/scheduler';
import { tenantRoutes } from './routes/tenants';
import type { AppOptions, AppVariables } from './types';

export function createApp(options: AppOptions) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use('*', secureHeaders());
  app.use('*', bodyLimit({ maxSize: 1024 * 1024 }));
  if (!options.env.isProduction) {
    app.use('*', logger());
  }
  app.use(
    '*',
    cors({
      origin: (origin) =>
        options.corsOrigins?.includes(origin) || options.env.corsOrigins.includes(origin)
          ? origin
          : undefined,
      credentials: true,
      allowHeaders: ['Content-Type', 'X-Organization-Id', 'X-Cron-Secret'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.use('*', async (c, next) => {
    c.set('db', options.db);
    c.set('auth', options.auth);
    await next();
  });

  app.route('/health', healthRoutes);
  app.route('/api/health', healthRoutes);

  app.all('/api/auth/*', (c) => options.auth.handler(c.req.raw));

  app.use('/api/*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth/')) return next();
    return requireAuth(c, next);
  });

  app.route('/api/me', meRoutes);
  app.route('/api/organizations', organizationRoutes);
  app.route('/api/members', memberRoutes);
  app.route('/api/properties', propertyRoutes);
  app.route('/api/rooms', roomRoutes);
  app.route('/api/tenants', tenantRoutes);
  app.route('/api/leases', leaseRoutes);
  app.route('/api/invoices', invoiceRoutes);
  app.route('/api/payments', paymentRoutes);
  app.route('/api/deposits', depositRoutes);
  app.route('/api/expenses', expenseRoutes);
  app.route('/api/dashboard', dashboardRoutes);
  app.route('/api/reports', reportRoutes);
  app.route('/api/scheduler', schedulerRoutes);
  app.route('/api/notifications', notificationRoutes);

  app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) {
      const body: ApiErrorBody = {
        error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' },
      };
      return c.json(body, 404);
    }
    return c.text('Not found', 404);
  });

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const response = error.getResponse();
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response;
      }
      return c.json<ApiErrorBody>(
        {
          error: {
            code: error.status === 401 ? 'UNAUTHENTICATED' : 'REQUEST_FAILED',
            message: error.message || 'Permintaan gagal.',
          },
        },
        error.status,
      );
    }

    if (isInvalidTextRepresentation(error)) {
      return c.json<ApiErrorBody>(
        {
          error: {
            code: 'INVALID_ID',
            message: 'ID tidak valid.',
          },
        },
        400,
      );
    }

    console.error('[api] unhandled error', error);
    return c.json<ApiErrorBody>(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
        },
      },
      500,
    );
  });

  return app;
}
