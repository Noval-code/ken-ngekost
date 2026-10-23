import { depositTransactions, deposits, leases, properties, rooms, tenants } from '@kost/database';
import { addMoney, compareMoney, toMoneyString } from '@kost/shared';
import { receiveDepositSchema, refundDepositSchema } from '@kost/validation';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import type { AppVariables } from '../types';

export const depositRoutes = new Hono<{ Variables: AppVariables }>();

const depositListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['held', 'partially_refunded', 'refunded', 'all']).default('all'),
  propertyId: z.string().uuid().optional(),
});

function depositStatus(received: string, refunded: string): string {
  if (compareMoney(refunded, '0') === 0) return 'held';
  if (compareMoney(refunded, received) >= 0) return 'refunded';
  return 'partially_refunded';
}

depositRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, depositListQuery);
  const page = paginationFrom(query);
  const conditions = [eq(deposits.organizationId, ctx.organization.id)];

  if (query.status !== 'all') conditions.push(eq(deposits.status, query.status));
  if (query.propertyId) {
    assertPropertyAccess(ctx, query.propertyId);
    conditions.push(eq(rooms.propertyId, query.propertyId));
  }
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(rooms.propertyId, ctx.accessiblePropertyIds));
  }

  const rows = await ctx.db
    .select({
      id: deposits.id,
      leaseId: deposits.leaseId,
      amountReceived: deposits.amountReceived,
      amountRefunded: deposits.amountRefunded,
      heldAmount: sql<string>`(${deposits.amountReceived} - ${deposits.amountRefunded})`,
      status: deposits.status,
      notes: deposits.notes,
      createdAt: deposits.createdAt,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      tenantName: tenants.name,
    })
    .from(deposits)
    .innerJoin(leases, eq(leases.id, deposits.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(...conditions))
    .orderBy(desc(deposits.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(deposits)
    .innerJoin(leases, eq(leases.id, deposits.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

depositRoutes.get('/:depositId', async (c) => {
  const ctx = c.get('ctx');
  const depositId = c.req.param('depositId');
  const [row] = await ctx.db
    .select({
      deposit: deposits,
      propertyId: properties.id,
      propertyName: properties.name,
      roomNumber: rooms.roomNumber,
      tenantName: tenants.name,
    })
    .from(deposits)
    .innerJoin(leases, eq(leases.id, deposits.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(eq(deposits.id, depositId), eq(deposits.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'DEPOSIT_NOT_FOUND', 'Deposit tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);

  const history = await ctx.db
    .select()
    .from(depositTransactions)
    .where(eq(depositTransactions.depositId, depositId))
    .orderBy(desc(depositTransactions.createdAt));

  return c.json({
    data: {
      ...row.deposit,
      heldAmount: addMoney(row.deposit.amountReceived, `-${row.deposit.amountRefunded}`),
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      roomNumber: row.roomNumber,
      tenantName: row.tenantName,
      history,
    },
  });
});

depositRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, receiveDepositSchema);

  const [lease] = await ctx.db
    .select({
      lease: leases,
      propertyId: rooms.propertyId,
    })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(eq(leases.id, input.leaseId), eq(leases.organizationId, ctx.organization.id)))
    .limit(1);
  if (!lease) fail(404, 'LEASE_NOT_FOUND', 'Kontrak tidak ditemukan.');
  assertPropertyAccess(ctx, lease.propertyId);

  await ctx.db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(deposits)
      .where(eq(deposits.leaseId, input.leaseId))
      .limit(1)
      .for('update');

    let depositId: string;
    if (existing) {
      const received = addMoney(existing.amountReceived, input.amount);
      await tx
        .update(deposits)
        .set({
          amountReceived: received,
          status: depositStatus(received, existing.amountRefunded),
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, existing.id));
      depositId = existing.id;
    } else {
      const [created] = await tx
        .insert(deposits)
        .values({
          organizationId: ctx.organization.id,
          leaseId: input.leaseId,
          amountReceived: input.amount,
          amountRefunded: '0.00',
          status: 'held',
          notes: input.notes ?? null,
        })
        .returning();
      if (!created) throw new Error('Deposit insert failed');
      depositId = created.id;
    }

    await tx.insert(depositTransactions).values({
      depositId,
      type: 'received',
      amount: input.amount,
      notes: input.notes ?? null,
      recordedBy: ctx.user.id,
    });

    await writeAudit(tx, ctx, {
      entityType: 'deposit',
      entityId: depositId,
      action: 'deposit.received',
      metadata: { leaseId: input.leaseId, amount: input.amount },
    });
  });

  return c.json({ data: { leaseId: input.leaseId } }, 201);
});

depositRoutes.post('/:depositId/refund', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const depositId = c.req.param('depositId');
  const input = await parseJson(c, refundDepositSchema);

  const [row] = await ctx.db
    .select({
      deposit: deposits,
      propertyId: rooms.propertyId,
    })
    .from(deposits)
    .innerJoin(leases, eq(leases.id, deposits.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(eq(deposits.id, depositId), eq(deposits.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'DEPOSIT_NOT_FOUND', 'Deposit tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);

  await ctx.db.transaction(async (tx) => {
    const [deposit] = await tx
      .select()
      .from(deposits)
      .where(eq(deposits.id, depositId))
      .limit(1)
      .for('update');
    if (!deposit) fail(404, 'DEPOSIT_NOT_FOUND', 'Deposit tidak ditemukan.');

    const held = addMoney(deposit.amountReceived, `-${deposit.amountRefunded}`);
    if (compareMoney(input.amount, held) > 0) {
      fail(409, 'REFUND_EXCEEDS_HELD', 'Nominal refund melebihi deposit yang masih ditahan.');
    }

    const refunded = addMoney(deposit.amountRefunded, input.amount);
    await tx
      .update(deposits)
      .set({
        amountRefunded: toMoneyString(refunded),
        status: depositStatus(deposit.amountReceived, refunded),
        updatedAt: new Date(),
      })
      .where(eq(deposits.id, depositId));

    await tx.insert(depositTransactions).values({
      depositId,
      type: 'refunded',
      amount: input.amount,
      notes: input.reason,
      recordedBy: ctx.user.id,
    });

    await writeAudit(tx, ctx, {
      entityType: 'deposit',
      entityId: depositId,
      action: 'deposit.refunded',
      metadata: { amount: input.amount, reason: input.reason },
    });
  });

  return c.json({ data: { id: depositId } });
});
