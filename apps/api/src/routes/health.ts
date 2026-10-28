import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppVariables } from '../types';

export const healthRoutes = new Hono<{ Variables: AppVariables }>();

healthRoutes.get('/', (c) =>
  c.json({
    status: 'ok',
    service: 'panggora-api',
    timestamp: new Date().toISOString(),
  }),
);

healthRoutes.get('/db', async (c) => {
  const db = c.get('db');
  await db.execute(sql`select 1`);
  return c.json({ status: 'ok', database: 'reachable' });
});
