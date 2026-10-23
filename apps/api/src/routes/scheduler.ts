import { Hono } from 'hono';
import { requireRole } from '../lib/access';
import { listSchedulerRuns, runInvoiceScheduler } from '../lib/scheduler';
import { parseJson } from '../lib/http';
import { z } from 'zod';
import type { AppVariables } from '../types';

export const schedulerRoutes = new Hono<{ Variables: AppVariables }>();

const rerunSchema = z.object({
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

schedulerRoutes.get('/runs', async (c) => {
  requireRole(c.get('ctx'), ['owner', 'admin']);
  return c.json({ data: await listSchedulerRuns(c.get('ctx').db) });
});

schedulerRoutes.post('/invoice-generation', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner']);
  const input = await parseJson(c, rerunSchema);
  const result = await runInvoiceScheduler(ctx.db, {
    organizationId: ctx.organization.id,
    today: input.today,
  });
  return c.json({ data: result });
});
