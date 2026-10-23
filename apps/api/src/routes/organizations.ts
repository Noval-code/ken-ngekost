import { organizations } from '@kost/database';
import { updateOrganizationSchema } from '@kost/validation';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { parseJson } from '../lib/http';
import type { AppVariables } from '../types';

export const organizationRoutes = new Hono<{ Variables: AppVariables }>();

organizationRoutes.get('/', (c) => c.json({ data: c.get('ctx').organization }));

organizationRoutes.patch('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner']);
  const input = await parseJson(c, updateOrganizationSchema);
  const [updated] = await ctx.db
    .update(organizations)
    .set({
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email === '' ? null : (input.email ?? null),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, ctx.organization.id))
    .returning();

  await writeAudit(ctx.db, ctx, {
    entityType: 'organization',
    entityId: ctx.organization.id,
    action: 'organization.updated',
    metadata: { name: input.name },
  });

  return c.json({ data: updated });
});
