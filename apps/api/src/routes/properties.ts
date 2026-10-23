import { properties } from '@kost/database';
import { createPropertySchema, paginationQuery, updatePropertySchema } from '@kost/validation';
import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { qualifiedColumn } from '../lib/sql';
import type { AppVariables } from '../types';

export const propertyRoutes = new Hono<{ Variables: AppVariables }>();

const propertyListQuery = paginationQuery.extend({
  status: z.enum(['active', 'inactive', 'all']).default('all'),
});

propertyRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, propertyListQuery);
  const page = paginationFrom(query);

  const conditions = [eq(properties.organizationId, ctx.organization.id)];
  if (query.status !== 'all') conditions.push(eq(properties.status, query.status));
  if (query.search) {
    conditions.push(
      or(
        ilike(properties.name, `%${query.search}%`),
        ilike(properties.address, `%${query.search}%`),
      )!,
    );
  }
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(properties.id, ctx.accessiblePropertyIds));
  }

  const rows = await ctx.db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
      description: properties.description,
      status: properties.status,
      createdAt: properties.createdAt,
      roomCount: sql<number>`(select count(*)::int from rooms r where r.property_id = ${qualifiedColumn(properties.id)})`,
      occupiedRooms: sql<number>`(
        select count(*)::int from rooms r
        join leases l on l.room_id = r.id and l.status = 'active'
        where r.property_id = ${qualifiedColumn(properties.id)}
      )`,
    })
    .from(properties)
    .where(and(...conditions))
    .orderBy(properties.name)
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(properties)
    .where(and(...conditions));

  return c.json(
    paginated(
      rows.map((row) => ({
        ...row,
        vacantRooms: row.roomCount - row.occupiedRooms,
        occupancyRate:
          row.roomCount === 0 ? 0 : Math.round((row.occupiedRooms / row.roomCount) * 100),
      })),
      Number(totalRow?.total ?? 0),
      page.page,
      page.pageSize,
    ),
  );
});

propertyRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);
  const input = await parseJson(c, createPropertySchema);

  const [property] = await ctx.db
    .insert(properties)
    .values({
      organizationId: ctx.organization.id,
      name: input.name,
      address: input.address,
      description: input.description ?? null,
      status: input.status,
    })
    .returning();

  if (!property) throw new Error('Property insert failed');

  await writeAudit(ctx.db, ctx, {
    entityType: 'property',
    entityId: property.id,
    action: 'property.created',
    metadata: { name: property.name },
  });

  return c.json({ data: property }, 201);
});

propertyRoutes.get('/:propertyId', async (c) => {
  const ctx = c.get('ctx');
  const propertyId = c.req.param('propertyId');
  assertPropertyAccess(ctx, propertyId);

  const [property] = await ctx.db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, ctx.organization.id)))
    .limit(1);

  if (!property) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');

  const [stats] = await ctx.db
    .select({
      roomCount: sql<number>`(select count(*)::int from rooms r where r.property_id = ${property.id})`,
      occupiedRooms: sql<number>`(
        select count(*)::int from rooms r
        join leases l on l.room_id = r.id and l.status = 'active'
        where r.property_id = ${property.id}
      )`,
    })
    .from(properties)
    .where(eq(properties.id, property.id));

  return c.json({
    data: {
      ...property,
      stats: {
        roomCount: stats?.roomCount ?? 0,
        occupiedRooms: stats?.occupiedRooms ?? 0,
        vacantRooms: (stats?.roomCount ?? 0) - (stats?.occupiedRooms ?? 0),
        occupancyRate:
          !stats || stats.roomCount === 0
            ? 0
            : Math.round((stats.occupiedRooms / stats.roomCount) * 100),
      },
    },
  });
});

propertyRoutes.patch('/:propertyId', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);
  const propertyId = c.req.param('propertyId');
  assertPropertyAccess(ctx, propertyId);
  const input = await parseJson(c, updatePropertySchema);

  const [existing] = await ctx.db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, ctx.organization.id)))
    .limit(1);
  if (!existing) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');

  const [updated] = await ctx.db
    .update(properties)
    .set({
      name: input.name ?? existing.name,
      address: input.address ?? existing.address,
      description: input.description === undefined ? existing.description : input.description,
      status: input.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, propertyId))
    .returning();

  await writeAudit(ctx.db, ctx, {
    entityType: 'property',
    entityId: propertyId,
    action: 'property.updated',
    metadata: { name: updated?.name },
  });

  return c.json({ data: updated });
});
