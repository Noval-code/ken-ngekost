import { notifications } from '@panggora/database';
import { notificationListQuery } from '@panggora/validation';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { fail, noContent, paginated, paginationFrom, parseQuery } from '../lib/http';
import type { AppVariables } from '../types';

export const notificationRoutes = new Hono<{ Variables: AppVariables }>();

notificationRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, notificationListQuery);
  const page = paginationFrom(query);
  const conditions = [
    eq(notifications.organizationId, ctx.organization.id),
    eq(notifications.userId, ctx.user.id),
  ];

  if (query.unreadOnly === 'true') {
    conditions.push(isNull(notifications.readAt));
  }

  const rows = await ctx.db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(notifications)
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

notificationRoutes.get('/unread-count', async (c) => {
  const ctx = c.get('ctx');
  const [row] = await ctx.db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, ctx.organization.id),
        eq(notifications.userId, ctx.user.id),
        isNull(notifications.readAt),
      ),
    );

  return c.json({ data: { count: Number(row?.count ?? 0) } });
});

notificationRoutes.patch('/:notificationId/read', async (c) => {
  const ctx = c.get('ctx');
  const notificationId = c.req.param('notificationId');

  const updated = await ctx.db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, ctx.user.id),
        eq(notifications.organizationId, ctx.organization.id),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  if (updated.length === 0) {
    fail(404, 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan atau sudah dibaca.');
  }

  return c.json({ data: { id: notificationId, read: true } });
});

notificationRoutes.post('/read-all', async (c) => {
  const ctx = c.get('ctx');

  await ctx.db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.organizationId, ctx.organization.id),
        eq(notifications.userId, ctx.user.id),
        isNull(notifications.readAt),
      ),
    );

  return noContent(c);
});
