import { leases, properties, rooms, tenants } from '@kost/database';
import { createRoomSchema, paginationQuery, updateRoomSchema } from '@kost/validation';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { isUniqueViolation } from '../lib/db-errors';
import type { AppVariables } from '../types';

export const roomRoutes = new Hono<{ Variables: AppVariables }>();

const roomListQuery = paginationQuery.extend({
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  occupancy: z.enum(['occupied', 'vacant', 'all']).default('all'),
});

const createRoomRouteSchema = createRoomSchema.extend({
  propertyId: z.string().uuid(),
});

const updateRoomRouteSchema = updateRoomSchema.extend({
  propertyId: z.string().uuid().optional(),
});

roomRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, roomListQuery);
  const page = paginationFrom(query);

  const conditions = [eq(rooms.organizationId, ctx.organization.id)];
  if (query.status !== 'all') conditions.push(eq(rooms.operationalStatus, query.status));
  if (query.propertyId) {
    assertPropertyAccess(ctx, query.propertyId);
    conditions.push(eq(rooms.propertyId, query.propertyId));
  }
  if (query.search) {
    conditions.push(
      or(
        ilike(rooms.roomNumber, `%${query.search}%`),
        ilike(properties.name, `%${query.search}%`),
        sql`exists (
          select 1 from leases l
          join tenants t on t.id = l.tenant_id
          where l.room_id = ${rooms.id} and l.status = 'active'
            and t.name ilike ${`%${query.search}%`}
        )`,
      )!,
    );
  }
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(rooms.propertyId, ctx.accessiblePropertyIds));
  }

  const activeLease = sql`(
    select l.id from leases l where l.room_id = ${rooms.id} and l.status = 'active' limit 1
  )`;
  const activeTenantName = sql<string | null>`(
    select t.name from leases l join tenants t on t.id = l.tenant_id
    where l.room_id = ${rooms.id} and l.status = 'active' limit 1
  )`;
  const activeTenantId = sql<string | null>`(
    select l.tenant_id from leases l where l.room_id = ${rooms.id} and l.status = 'active' limit 1
  )`;

  if (query.occupancy !== 'all') {
    conditions.push(
      query.occupancy === 'occupied'
        ? sql`${activeLease} is not null`
        : sql`${activeLease} is null`,
    );
  }

  const rows = await ctx.db
    .select({
      id: rooms.id,
      organizationId: rooms.organizationId,
      propertyId: rooms.propertyId,
      propertyName: properties.name,
      roomNumber: rooms.roomNumber,
      baseRent: rooms.baseRent,
      operationalStatus: rooms.operationalStatus,
      description: rooms.description,
      updatedAt: rooms.updatedAt,
      activeLeaseId: activeLease,
      activeTenantId,
      activeTenantName,
      occupancy: sql<
        'occupied' | 'vacant'
      >`case when ${activeLease} is not null then 'occupied' else 'vacant' end`,
    })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(...conditions))
    .orderBy(properties.name, rooms.roomNumber)
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

roomRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, createRoomRouteSchema);
  assertPropertyAccess(ctx, input.propertyId);

  const [property] = await ctx.db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(eq(properties.id, input.propertyId), eq(properties.organizationId, ctx.organization.id)),
    )
    .limit(1);
  if (!property) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');

  try {
    const [room] = await ctx.db
      .insert(rooms)
      .values({
        organizationId: ctx.organization.id,
        propertyId: input.propertyId,
        roomNumber: input.roomNumber,
        baseRent: input.baseRent,
        operationalStatus: input.operationalStatus,
        description: input.description ?? null,
      })
      .returning();

    if (!room) throw new Error('Room insert failed');

    await writeAudit(ctx.db, ctx, {
      entityType: 'room',
      entityId: room.id,
      action: 'room.created',
      metadata: { roomNumber: room.roomNumber, propertyId: room.propertyId },
    });

    return c.json({ data: room }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      fail(409, 'ROOM_NUMBER_EXISTS', 'Nomor kamar sudah digunakan di properti ini.');
    }
    throw error;
  }
});

roomRoutes.get('/:roomId', async (c) => {
  const ctx = c.get('ctx');
  const roomId = c.req.param('roomId');
  const [room] = await ctx.db
    .select({
      room: rooms,
      propertyName: properties.name,
    })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(eq(rooms.id, roomId), eq(rooms.organizationId, ctx.organization.id)))
    .limit(1);

  if (!room) fail(404, 'ROOM_NOT_FOUND', 'Kamar tidak ditemukan.');
  assertPropertyAccess(ctx, room.room.propertyId);

  const history = await ctx.db
    .select({
      lease: leases,
      tenantName: tenants.name,
      tenantPhone: tenants.phone,
    })
    .from(leases)
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(eq(leases.roomId, roomId))
    .orderBy(desc(leases.startDate));

  return c.json({
    data: {
      ...room.room,
      propertyName: room.propertyName,
      occupancy: room.room.operationalStatus === 'active' ? 'available' : 'inactive',
      leases: history,
    },
  });
});

roomRoutes.patch('/:roomId', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const roomId = c.req.param('roomId');
  const input = await parseJson(c, updateRoomRouteSchema);

  const [room] = await ctx.db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.organizationId, ctx.organization.id)))
    .limit(1);
  if (!room) fail(404, 'ROOM_NOT_FOUND', 'Kamar tidak ditemukan.');
  assertPropertyAccess(ctx, room.propertyId);

  const propertyId = input.propertyId ?? room.propertyId;
  if (input.propertyId && input.propertyId !== room.propertyId) {
    assertPropertyAccess(ctx, input.propertyId);
    const [property] = await ctx.db
      .select({ id: properties.id })
      .from(properties)
      .where(
        and(
          eq(properties.id, input.propertyId),
          eq(properties.organizationId, ctx.organization.id),
        ),
      )
      .limit(1);
    if (!property) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');
  }

  try {
    const [updated] = await ctx.db
      .update(rooms)
      .set({
        propertyId,
        roomNumber: input.roomNumber ?? room.roomNumber,
        baseRent: input.baseRent ?? room.baseRent,
        operationalStatus: input.operationalStatus ?? room.operationalStatus,
        description: input.description === undefined ? room.description : input.description,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, roomId))
      .returning();

    await writeAudit(ctx.db, ctx, {
      entityType: 'room',
      entityId: roomId,
      action: 'room.updated',
      metadata: {
        before: {
          roomNumber: room.roomNumber,
          baseRent: room.baseRent,
          operationalStatus: room.operationalStatus,
        },
        after: {
          roomNumber: updated?.roomNumber,
          baseRent: updated?.baseRent,
          operationalStatus: updated?.operationalStatus,
        },
      },
    });

    return c.json({ data: updated });
  } catch (error) {
    if (isUniqueViolation(error)) {
      fail(409, 'ROOM_NUMBER_EXISTS', 'Nomor kamar sudah digunakan di properti ini.');
    }
    throw error;
  }
});
