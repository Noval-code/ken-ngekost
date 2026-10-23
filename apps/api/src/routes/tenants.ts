import { invoices, leases, properties, rooms, tenants } from '@kost/database';
import { createTenantSchema, paginationQuery, updateTenantSchema } from '@kost/validation';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { qualifiedColumn } from '../lib/sql';
import type { AppVariables } from '../types';

export const tenantRoutes = new Hono<{ Variables: AppVariables }>();

tenantRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, paginationQuery);
  const page = paginationFrom(query);
  const conditions = [eq(tenants.organizationId, ctx.organization.id)];

  if (query.search) {
    conditions.push(
      or(ilike(tenants.name, `%${query.search}%`), ilike(tenants.phone, `%${query.search}%`))!,
    );
  }

  const activeRoom = sql<string | null>`(
    select r.room_number from leases l join rooms r on r.id = l.room_id
    where l.tenant_id = ${qualifiedColumn(tenants.id)} and l.status = 'active' limit 1
  )`;
  const activeProperty = sql<string | null>`(
    select p.name from leases l join rooms r on r.id = l.room_id
    join properties p on p.id = r.property_id
    where l.tenant_id = ${qualifiedColumn(tenants.id)} and l.status = 'active' limit 1
  )`;

  const rows = await ctx.db
    .select({
      id: tenants.id,
      name: tenants.name,
      phone: tenants.phone,
      notes: tenants.notes,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      activeRoom,
      activeProperty,
    })
    .from(tenants)
    .where(and(...conditions))
    .orderBy(desc(tenants.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(tenants)
    .where(and(...conditions));

  return c.json(
    paginated(
      rows.map((row) => ({ ...row, occupancy: row.activeRoom ? 'active' : 'none' })),
      Number(totalRow?.total ?? 0),
      page.page,
      page.pageSize,
    ),
  );
});

tenantRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, createTenantSchema);

  const [tenant] = await ctx.db
    .insert(tenants)
    .values({
      organizationId: ctx.organization.id,
      name: input.name,
      phone: input.phone,
      notes: input.notes ?? null,
    })
    .returning();

  if (!tenant) throw new Error('Tenant insert failed');

  await writeAudit(ctx.db, ctx, {
    entityType: 'tenant',
    entityId: tenant.id,
    action: 'tenant.created',
    metadata: { name: tenant.name },
  });

  return c.json({ data: tenant }, 201);
});

tenantRoutes.get('/:tenantId', async (c) => {
  const ctx = c.get('ctx');
  const tenantId = c.req.param('tenantId');
  const [tenant] = await ctx.db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, ctx.organization.id)))
    .limit(1);

  if (!tenant) fail(404, 'TENANT_NOT_FOUND', 'Penghuni tidak ditemukan.');

  const leaseConditions = [eq(leases.tenantId, tenantId)];
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json({ data: { ...tenant, leases: [], invoices: [] } });
    }
    leaseConditions.push(inArray(rooms.propertyId, ctx.accessiblePropertyIds));
  }

  const leaseRows = await ctx.db
    .select({
      lease: leases,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
    })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(...leaseConditions))
    .orderBy(desc(leases.startDate));

  const invoiceRows = await ctx.db
    .select({
      invoice: invoices,
      roomNumber: rooms.roomNumber,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(...leaseConditions))
    .orderBy(desc(invoices.periodStart))
    .limit(60);

  return c.json({
    data: {
      ...tenant,
      leases: leaseRows,
      invoices: invoiceRows,
    },
  });
});

tenantRoutes.patch('/:tenantId', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const tenantId = c.req.param('tenantId');
  const input = await parseJson(c, updateTenantSchema);

  const [tenant] = await ctx.db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.organizationId, ctx.organization.id)))
    .limit(1);
  if (!tenant) fail(404, 'TENANT_NOT_FOUND', 'Penghuni tidak ditemukan.');

  const [updated] = await ctx.db
    .update(tenants)
    .set({
      name: input.name ?? tenant.name,
      phone: input.phone ?? tenant.phone,
      notes: input.notes === undefined ? tenant.notes : input.notes,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
    .returning();

  await writeAudit(ctx.db, ctx, {
    entityType: 'tenant',
    entityId: tenantId,
    action: 'tenant.updated',
    metadata: { name: updated?.name },
  });

  return c.json({ data: updated });
});
