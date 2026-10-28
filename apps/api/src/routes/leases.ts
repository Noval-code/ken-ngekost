import {
  deposits,
  depositTransactions,
  invoices,
  leases,
  properties,
  rooms,
  tenants,
} from '@panggora/database';
import { billablePeriods, firstBillablePeriodEnd, formatIndonesianDate } from '@panggora/shared';
import { createLeaseSchema, endLeaseSchema, paginationQuery } from '@panggora/validation';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { isUniqueViolation } from '../lib/db-errors';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { qualifiedColumn } from '../lib/sql';
import { createInvoiceForPeriod } from '../lib/invoices';
import {
  notifyOrganizationMembers,
  invoiceIssuedNotification,
  depositReceivedNotification,
} from '../lib/notifications';
import type { AppVariables } from '../types';

export const leaseRoutes = new Hono<{ Variables: AppVariables }>();

const leaseListQuery = paginationQuery.extend({
  status: z.enum(['active', 'ended', 'cancelled', 'all']).default('active'),
  tenantId: z.string().uuid().optional(),
});

leaseRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, leaseListQuery);
  const page = paginationFrom(query);
  const conditions = [eq(leases.organizationId, ctx.organization.id)];

  if (query.status !== 'all') conditions.push(eq(leases.status, query.status));
  if (query.propertyId) {
    assertPropertyAccess(ctx, query.propertyId);
    conditions.push(eq(rooms.propertyId, query.propertyId));
  }
  if (query.tenantId) conditions.push(eq(leases.tenantId, query.tenantId));
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(rooms.propertyId, ctx.accessiblePropertyIds));
  }

  const rows = await ctx.db
    .select({
      id: leases.id,
      status: leases.status,
      startDate: leases.startDate,
      endDate: leases.endDate,
      rentAmount: leases.rentAmount,
      depositAmount: leases.depositAmount,
      billingAnchorDay: leases.billingAnchorDay,
      roomId: leases.roomId,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      tenantId: leases.tenantId,
      tenantName: tenants.name,
      tenantPhone: tenants.phone,
      createdAt: leases.createdAt,
    })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(...conditions))
    .orderBy(desc(leases.startDate))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

leaseRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, createLeaseSchema);

  const [room] = await ctx.db
    .select({
      room: rooms,
      propertyId: properties.id,
    })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(and(eq(rooms.id, input.roomId), eq(rooms.organizationId, ctx.organization.id)))
    .limit(1);

  if (!room) fail(404, 'ROOM_NOT_FOUND', 'Kamar tidak ditemukan.');
  assertPropertyAccess(ctx, room.propertyId);
  if (room.room.operationalStatus !== 'active') {
    fail(400, 'ROOM_INACTIVE', 'Kamar sedang tidak aktif.');
  }

  const [tenant] = await ctx.db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, input.tenantId), eq(tenants.organizationId, ctx.organization.id)))
    .limit(1);
  if (!tenant) fail(404, 'TENANT_NOT_FOUND', 'Penghuni tidak ditemukan.');

  const anchorDay = Number(input.startDate.slice(8, 10));
  const minimumEnd = firstBillablePeriodEnd(input.startDate, anchorDay);
  if (input.endDate < minimumEnd) {
    fail(
      400,
      'LEASE_TOO_SHORT',
      `Kontrak minimal mencakup satu periode penuh. Tanggal akhir minimal ${formatIndonesianDate(
        minimumEnd,
      )}.`,
    );
  }

  try {
    const leaseId = await ctx.db.transaction(async (tx) => {
      const [active] = await tx
        .select({ id: leases.id })
        .from(leases)
        .where(and(eq(leases.roomId, input.roomId), eq(leases.status, 'active')))
        .limit(1)
        .for('update');

      if (active) {
        fail(409, 'ROOM_OCCUPIED', 'Kamar masih memiliki kontrak aktif.');
      }

      const [lease] = await tx
        .insert(leases)
        .values({
          organizationId: ctx.organization.id,
          roomId: input.roomId,
          tenantId: input.tenantId,
          startDate: input.startDate,
          endDate: input.endDate,
          rentAmount: input.rentAmount,
          billingAnchorDay: anchorDay,
          depositAmount: input.depositAmount,
          status: 'active',
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
        })
        .returning();

      if (!lease) throw new Error('Lease insert failed');

      const period = billablePeriods(lease.startDate, lease.billingAnchorDay, lease.endDate, 1)[0];
      if (!period) throw new Error('No billable period generated');
      const invoice = await createInvoiceForPeriod(tx, lease, period, {
        actorUserId: ctx.user.id,
      });
      if (!invoice) fail(409, 'INVOICE_EXISTS', 'Invoice periode pertama sudah ada.');

      if (Number(lease.depositAmount) > 0) {
        const [deposit] = await tx
          .insert(deposits)
          .values({
            organizationId: ctx.organization.id,
            leaseId: lease.id,
            amountReceived: lease.depositAmount,
            amountRefunded: '0.00',
            status: 'held',
            notes: input.notes ?? null,
          })
          .returning();
        if (deposit) {
          await tx.insert(depositTransactions).values({
            depositId: deposit.id,
            type: 'received',
            amount: lease.depositAmount,
            notes: 'Deposit awal kontrak',
            recordedBy: ctx.user.id,
          });
        }
      }

      await writeAudit(tx, ctx, {
        entityType: 'lease',
        entityId: lease.id,
        action: 'lease.activated',
        metadata: {
          roomId: lease.roomId,
          tenantId: lease.tenantId,
          startDate: lease.startDate,
          endDate: lease.endDate,
          rentAmount: lease.rentAmount,
          depositAmount: lease.depositAmount,
          invoiceId: invoice.id,
        },
      });

      const [roomInfo] = await tx
        .select({ propertyName: properties.name })
        .from(properties)
        .where(eq(properties.id, room.propertyId))
        .limit(1);

      await notifyOrganizationMembers(
        tx,
        ctx.organization.id,
        invoiceIssuedNotification({
          tenantName: tenant.name,
          roomNumber: room.room.roomNumber,
          propertyName: roomInfo?.propertyName ?? '',
          periodStart: period.start,
          periodEnd: period.end,
          totalAmount: lease.rentAmount,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }),
        { propertyId: room.propertyId },
      );

      if (Number(lease.depositAmount) > 0) {
        await notifyOrganizationMembers(
          tx,
          ctx.organization.id,
          depositReceivedNotification({
            tenantName: tenant.name,
            roomNumber: room.room.roomNumber,
            amount: lease.depositAmount,
            depositId: lease.id,
          }),
          { propertyId: room.propertyId },
        );
      }

      return lease.id;
    });

    return c.json({ data: { id: leaseId } }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      fail(409, 'ROOM_OCCUPIED', 'Kamar masih memiliki kontrak aktif.');
    }
    throw error;
  }
});

leaseRoutes.get('/:leaseId', async (c) => {
  const ctx = c.get('ctx');
  const leaseId = c.req.param('leaseId');
  const [row] = await ctx.db
    .select({
      lease: leases,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantPhone: tenants.phone,
    })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(eq(leases.id, leaseId), eq(leases.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'LEASE_NOT_FOUND', 'Kontrak tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);

  const invoiceRows = await ctx.db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      dueDate: invoices.dueDate,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      paidAmount: sql<string>`coalesce((
        select sum(pa.amount) from payment_allocations pa
        join payments p on p.id = pa.payment_id
        where pa.invoice_id = ${qualifiedColumn(invoices.id)} and p.status = 'received'
      ), 0)`,
      balance: sql<string>`(${invoices.totalAmount} - coalesce((
        select sum(pa.amount) from payment_allocations pa
        join payments p on p.id = pa.payment_id
        where pa.invoice_id = ${qualifiedColumn(invoices.id)} and p.status = 'received'
      ), 0))`,
    })
    .from(invoices)
    .where(eq(invoices.leaseId, leaseId))
    .orderBy(desc(invoices.periodStart));

  const periods = billablePeriods(
    row.lease.startDate,
    row.lease.billingAnchorDay,
    row.lease.endDate,
  );

  return c.json({
    data: {
      ...row.lease,
      roomNumber: row.roomNumber,
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantPhone: row.tenantPhone,
      invoices: invoiceRows,
      periods,
    },
  });
});

leaseRoutes.post('/:leaseId/end', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const leaseId = c.req.param('leaseId');
  const input = await parseJson(c, endLeaseSchema);

  const [row] = await ctx.db
    .select({
      lease: leases,
      propertyId: properties.id,
    })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(eq(leases.id, leaseId), eq(leases.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'LEASE_NOT_FOUND', 'Kontrak tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);
  if (row.lease.status !== 'active') {
    fail(409, 'LEASE_NOT_ACTIVE', 'Hanya kontrak aktif yang dapat diakhiri.');
  }
  if (input.endDate < row.lease.startDate) {
    fail(400, 'INVALID_END_DATE', 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
  }

  await ctx.db.transaction(async (tx) => {
    await tx
      .update(leases)
      .set({
        status: 'ended',
        endDate: input.endDate,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leases.id, leaseId));

    await writeAudit(tx, ctx, {
      entityType: 'lease',
      entityId: leaseId,
      action: 'lease.ended',
      metadata: {
        reason: input.reason,
        previousEndDate: row.lease.endDate,
        newEndDate: input.endDate,
      },
    });
  });

  return c.json({ data: { id: leaseId, status: 'ended', endDate: input.endDate } });
});
