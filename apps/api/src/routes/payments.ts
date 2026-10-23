import {
  invoices,
  leases,
  paymentAllocations,
  payments,
  properties,
  rooms,
  tenants,
} from '@kost/database';
import { addMoney, compareMoney, toMoneyString } from '@kost/shared';
import { createPaymentSchema, voidPaymentSchema } from '@kost/validation';
import { and, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { isUniqueViolation } from '../lib/db-errors';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { qualifiedColumn } from '../lib/sql';
import type { AppVariables } from '../types';

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();

const paymentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  method: z.enum(['cash', 'bank_transfer', 'all']).default('all'),
  status: z.enum(['received', 'void', 'all']).default('received'),
  from: z.string().optional(),
  to: z.string().optional(),
});

function paymentNumber(paidAt: string): string {
  const datePart = paidAt.replaceAll('-', '');
  return `PAY-${datePart}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

paymentRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, paymentListQuery);
  const page = paginationFrom(query);
  const conditions = [eq(payments.organizationId, ctx.organization.id)];

  if (query.method !== 'all') conditions.push(eq(payments.method, query.method));
  if (query.status !== 'all') conditions.push(eq(payments.status, query.status));
  if (query.from) conditions.push(gte(payments.paidAt, query.from));
  if (query.to) conditions.push(lte(payments.paidAt, query.to));
  if (query.search) {
    conditions.push(
      or(
        ilike(payments.paymentNumber, `%${query.search}%`),
        ilike(payments.reference, `%${query.search}%`),
      )!,
    );
  }
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(sql`exists (
      select 1 from payment_allocations pa
      join invoices i on i.id = pa.invoice_id
      join leases l on l.id = i.lease_id
      join rooms r on r.id = l.room_id
      where pa.payment_id = ${qualifiedColumn(payments.id)}
        and r.property_id in (${sql.join(
          ctx.accessiblePropertyIds.map((id) => sql`${id}`),
          sql`, `,
        )})
    )`);
  }

  const rows = await ctx.db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      amount: payments.amount,
      method: payments.method,
      paidAt: payments.paidAt,
      reference: payments.reference,
      notes: payments.notes,
      status: payments.status,
      createdAt: payments.createdAt,
      invoiceNumbers: sql<string>`coalesce((
        select string_agg(i.invoice_number, ', ' order by i.period_start)
        from payment_allocations pa join invoices i on i.id = pa.invoice_id
        where pa.payment_id = ${qualifiedColumn(payments.id)}
      ), '')`,
      tenantNames: sql<string>`coalesce((
        select string_agg(distinct t.name, ', ')
        from payment_allocations pa
        join invoices i on i.id = pa.invoice_id
        join leases l on l.id = i.lease_id
        join tenants t on t.id = l.tenant_id
        where pa.payment_id = ${qualifiedColumn(payments.id)}
      ), '')`,
    })
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(payments)
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

paymentRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, createPaymentSchema);

  const normalized = new Map<string, string>();
  for (const allocation of input.allocations) {
    normalized.set(
      allocation.invoiceId,
      addMoney(normalized.get(allocation.invoiceId) ?? '0', allocation.amount),
    );
  }
  const allocationTotal = [...normalized.values()].reduce(
    (total, amount) => addMoney(total, amount),
    '0',
  );
  if (compareMoney(allocationTotal, input.amount) !== 0) {
    fail(400, 'ALLOCATION_MISMATCH', 'Total alokasi harus sama dengan nominal pembayaran.');
  }

  try {
    const result = await ctx.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, ctx.organization.id),
            eq(payments.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) return { id: existing.id, duplicated: true };

      const invoiceIds = [...normalized.keys()];
      const invoiceRows = await tx
        .select({
          invoice: invoices,
          propertyId: rooms.propertyId,
        })
        .from(invoices)
        .innerJoin(leases, eq(leases.id, invoices.leaseId))
        .innerJoin(rooms, eq(rooms.id, leases.roomId))
        .where(
          and(eq(invoices.organizationId, ctx.organization.id), inArray(invoices.id, invoiceIds)),
        )
        .for('update');

      if (invoiceRows.length !== invoiceIds.length) {
        fail(400, 'INVOICE_INVALID', 'Satu atau lebih tagihan tidak ditemukan.');
      }

      for (const row of invoiceRows) {
        assertPropertyAccess(ctx, row.propertyId);
        if (row.invoice.status !== 'issued') {
          fail(400, 'INVOICE_VOID', 'Tagihan yang dibatalkan tidak dapat dibayar.');
        }
      }

      const paidRows = await tx
        .select({
          invoiceId: paymentAllocations.invoiceId,
          amount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
        })
        .from(paymentAllocations)
        .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
        .where(
          and(inArray(paymentAllocations.invoiceId, invoiceIds), eq(payments.status, 'received')),
        )
        .groupBy(paymentAllocations.invoiceId);

      const paidMap = new Map(paidRows.map((row) => [row.invoiceId, row.amount]));
      const invoiceMap = new Map(invoiceRows.map((row) => [row.invoice.id, row.invoice]));

      for (const [invoiceId, amount] of normalized) {
        const invoice = invoiceMap.get(invoiceId);
        if (!invoice) fail(400, 'INVOICE_INVALID', 'Tagihan tidak ditemukan.');
        const balance = addMoney(invoice.totalAmount, `-${paidMap.get(invoiceId) ?? '0'}`);
        if (compareMoney(amount, balance) > 0) {
          fail(
            409,
            'ALLOCATION_EXCEEDS_BALANCE',
            `Alokasi melebihi saldo tagihan ${invoice.invoiceNumber}.`,
          );
        }
      }

      const [payment] = await tx
        .insert(payments)
        .values({
          organizationId: ctx.organization.id,
          paymentNumber: paymentNumber(input.paidAt),
          amount: input.amount,
          method: input.method,
          paidAt: input.paidAt,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          status: 'received',
          recordedBy: ctx.user.id,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      if (!payment) throw new Error('Payment insert failed');

      await tx.insert(paymentAllocations).values(
        [...normalized.entries()].map(([invoiceId, amount]) => ({
          paymentId: payment.id,
          invoiceId,
          amount: toMoneyString(amount),
        })),
      );

      await writeAudit(tx, ctx, {
        entityType: 'payment',
        entityId: payment.id,
        action: 'payment.recorded',
        metadata: {
          paymentNumber: payment.paymentNumber,
          amount: payment.amount,
          method: payment.method,
          paidAt: payment.paidAt,
          allocations: [...normalized.entries()].map(([invoiceId, amount]) => ({
            invoiceId,
            amount: toMoneyString(amount),
          })),
        },
      });

      return { id: payment.id, duplicated: false };
    });

    return c.json({ data: result }, result.duplicated ? 200 : 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [existing] = await ctx.db
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, ctx.organization.id),
            eq(payments.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) return c.json({ data: { id: existing.id, duplicated: true } }, 200);
    }
    throw error;
  }
});

paymentRoutes.get('/:paymentId', async (c) => {
  const ctx = c.get('ctx');
  const paymentId = c.req.param('paymentId');
  const [payment] = await ctx.db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.organizationId, ctx.organization.id)))
    .limit(1);

  if (!payment) fail(404, 'PAYMENT_NOT_FOUND', 'Pembayaran tidak ditemukan.');

  const allocations = await ctx.db
    .select({
      id: paymentAllocations.id,
      amount: paymentAllocations.amount,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      roomNumber: rooms.roomNumber,
      propertyId: rooms.propertyId,
      propertyName: properties.name,
      tenantName: tenants.name,
    })
    .from(paymentAllocations)
    .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(eq(paymentAllocations.paymentId, paymentId));

  for (const allocation of allocations) {
    assertPropertyAccess(ctx, allocation.propertyId);
  }

  return c.json({
    data: {
      ...payment,
      allocations,
    },
  });
});

paymentRoutes.post('/:paymentId/void', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);
  const paymentId = c.req.param('paymentId');
  const input = await parseJson(c, voidPaymentSchema);

  const [payment] = await ctx.db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.organizationId, ctx.organization.id)))
    .limit(1);
  if (!payment) fail(404, 'PAYMENT_NOT_FOUND', 'Pembayaran tidak ditemukan.');
  if (payment.status === 'void') {
    fail(409, 'PAYMENT_ALREADY_VOID', 'Pembayaran sudah dibatalkan.');
  }

  await ctx.db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({
        status: 'void',
        voidReason: input.reason,
        voidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    await writeAudit(tx, ctx, {
      entityType: 'payment',
      entityId: paymentId,
      action: 'payment.voided',
      metadata: {
        reason: input.reason,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
      },
    });
  });

  return c.json({ data: { id: paymentId, status: 'void' } });
});
