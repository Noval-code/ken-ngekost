import { organizationMembers, organizations } from '@kost/database';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AppContext } from '../lib/access';
import type { AppVariables } from '../types';

export const meRoutes = new Hono<{ Variables: AppVariables }>();

meRoutes.get('/', async (c: AppContext) => {
  const ctx = c.get('ctx');
  const memberships = await ctx.db
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
      status: organizationMembers.status,
      organization: {
        id: organizations.id,
        name: organizations.name,
      },
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, ctx.user.id));

  return c.json({
    data: {
      user: ctx.user,
      organization: ctx.organization,
      membership: {
        id: ctx.membership.id,
        role: ctx.membership.role,
        status: ctx.membership.status,
      },
      memberships: memberships.filter((item) => item.status === 'active'),
      accessiblePropertyIds: ctx.accessiblePropertyIds,
    },
  });
});
