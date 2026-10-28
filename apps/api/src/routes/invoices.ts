import {
  invoiceItems,
  invoices,
  leases,
  paymentAllocations,
  payments,
  properties,
  rooms,
  tenants,
} from '@panggora/database';
import { invoiceListQuery, voidInvoiceSchema } from '@panggora/validation';
import { and, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import { generateInvoicePdf } from '../lib/pdf';
import type { AppVariables } from '../types';

export const invoiceRoutes = new Hono<{ Variables: AppVariables }>();

const paidAmountSql = sql<string>`coalesce((
  select sum(pa.amount) from payment_allocations pa
  join payments p on p.id = pa.payment_id
  where pa.invoice_id = ${invoices.id} and p.status = 'received'
), 0)`;

const balanceSql = sql<string>`(${invoices.totalAmount} - ${paidAmountSql})`;

const derivedStatusSql = sql<string>`case
  when ${invoices.status} = 'void' then 'void'
  when ${balanceSql} <= 0 then 'paid'
  when ${invoices.dueDate} < current_date and ${balanceSql} > 0 then 'overdue'
  when ${paidAmountSql} > 0 then 'partial'
  else 'unpaid'
end`;

invoiceRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, invoiceListQuery);
  const page = paginationFrom(query);

  const conditions = [eq(invoices.organizationId, ctx.organization.id)];
  if (query.propertyId) {
    assertPropertyAccess(ctx, query.propertyId);
    conditions.push(eq(rooms.propertyId, query.propertyId));
  }
  if (query.tenantId) conditions.push(eq(leases.tenantId, query.tenantId));
  if (query.periodStart) conditions.push(gte(invoices.periodStart, query.periodStart));
  if (query.periodEnd) conditions.push(lte(invoices.periodEnd, query.periodEnd));
  if (query.search) {
    conditions.push(
      or(
        ilike(invoices.invoiceNumber, `%${query.search}%`),
        ilike(tenants.name, `%${query.search}%`),
        ilike(rooms.roomNumber, `%${query.search}%`),
      )!,
    );
  }
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(rooms.propertyId, ctx.accessiblePropertyIds));
  }

  if (query.status !== 'all') {
    if (query.status === 'unpaid') {
      conditions.push(sql`${invoices.status} = 'issued' and ${paidAmountSql} = 0`);
    } else if (query.status === 'partial') {
      conditions.push(
        sql`${invoices.status} = 'issued' and ${paidAmountSql} > 0 and ${paidAmountSql} < ${invoices.totalAmount}`,
      );
    } else if (query.status === 'paid') {
      conditions.push(
        sql`${invoices.status} = 'issued' and ${paidAmountSql} >= ${invoices.totalAmount}`,
      );
    } else if (query.status === 'overdue') {
      conditions.push(
        sql`${invoices.status} = 'issued' and ${paidAmountSql} < ${invoices.totalAmount} and ${invoices.dueDate} < current_date`,
      );
    } else if (query.status === 'void') {
      conditions.push(eq(invoices.status, 'void'));
    }
  }

  const rows = await ctx.db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      dueDate: invoices.dueDate,
      totalAmount: invoices.totalAmount,
      invoiceStatus: invoices.status,
      paidAmount: paidAmountSql,
      balance: balanceSql,
      derivedStatus: derivedStatusSql,
      leaseId: invoices.leaseId,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      tenantId: tenants.id,
      tenantName: tenants.name,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(...conditions))
    .orderBy(desc(invoices.periodStart), desc(invoices.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(...conditions));

  return c.json(paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize));
});

invoiceRoutes.get('/:invoiceId', async (c) => {
  const ctx = c.get('ctx');
  const invoiceId = c.req.param('invoiceId');
  const [row] = await ctx.db
    .select({
      invoice: invoices,
      leaseId: leases.id,
      leaseStart: leases.startDate,
      leaseEnd: leases.endDate,
      roomId: rooms.id,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantPhone: tenants.phone,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'INVOICE_NOT_FOUND', 'Tagihan tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);

  const items = await ctx.db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const allocations = await ctx.db
    .select({
      id: paymentAllocations.id,
      amount: paymentAllocations.amount,
      paymentId: payments.id,
      paymentNumber: payments.paymentNumber,
      paidAt: payments.paidAt,
      method: payments.method,
      paymentStatus: payments.status,
      reference: payments.reference,
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .where(and(eq(paymentAllocations.invoiceId, invoiceId), eq(payments.status, 'received')))
    .orderBy(desc(payments.paidAt));

  const paidAmount = allocations.reduce((sum, item) => sum + Number(item.amount), 0);

  return c.json({
    data: {
      ...row.invoice,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantPhone: row.tenantPhone,
      items,
      allocations,
      paidAmount: paidAmount.toFixed(2),
      balance: (Number(row.invoice.totalAmount) - paidAmount).toFixed(2),
      derivedStatus:
        row.invoice.status === 'void'
          ? 'void'
          : paidAmount >= Number(row.invoice.totalAmount)
            ? 'paid'
            : paidAmount > 0
              ? row.invoice.dueDate < new Date().toISOString().slice(0, 10)
                ? 'overdue'
                : 'partial'
              : row.invoice.dueDate < new Date().toISOString().slice(0, 10)
                ? 'overdue'
                : 'unpaid',
    },
  });
});

invoiceRoutes.get('/:invoiceId/pdf', async (c) => {
  const ctx = c.get('ctx');
  const invoiceId = c.req.param('invoiceId');
  const [row] = await ctx.db
    .select({
      invoice: invoices,
      leaseId: leases.id,
      leaseStart: leases.startDate,
      leaseEnd: leases.endDate,
      roomId: rooms.id,
      roomNumber: rooms.roomNumber,
      propertyId: properties.id,
      propertyName: properties.name,
      propertyAddress: properties.address,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantPhone: tenants.phone,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'INVOICE_NOT_FOUND', 'Tagihan tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);

  const items = await ctx.db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const allocations = await ctx.db
    .select({
      id: paymentAllocations.id,
      amount: paymentAllocations.amount,
      paymentId: payments.id,
      paymentNumber: payments.paymentNumber,
      paidAt: payments.paidAt,
      method: payments.method,
      paymentStatus: payments.status,
      reference: payments.reference,
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .where(and(eq(paymentAllocations.invoiceId, invoiceId), eq(payments.status, 'received')))
    .orderBy(desc(payments.paidAt));

  const paidAmount = allocations.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = (Number(row.invoice.totalAmount) - paidAmount).toFixed(2);
  const derivedStatus =
    row.invoice.status === 'void'
      ? 'void'
      : paidAmount >= Number(row.invoice.totalAmount)
        ? 'paid'
        : paidAmount > 0
          ? row.invoice.dueDate < new Date().toISOString().slice(0, 10)
            ? 'overdue'
            : 'partial'
          : row.invoice.dueDate < new Date().toISOString().slice(0, 10)
            ? 'overdue'
            : 'unpaid';

  const pdfBytes = await generateInvoicePdf({
    organization: ctx.organization,
    invoice: row.invoice,
    property: {
      name: row.propertyName,
      address: row.propertyAddress,
    },
    room: {
      roomNumber: row.roomNumber,
    },
    tenant: {
      name: row.tenantName,
      phone: row.tenantPhone,
    },
    items,
    allocations,
    paidAmount: paidAmount.toFixed(2),
    balance,
    derivedStatus,
  });

  const isDownload = c.req.query('download') === 'true';
  const disposition = isDownload ? 'attachment' : 'inline';

  return c.body(pdfBytes.buffer as ArrayBuffer, 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="Invoice-${row.invoice.invoiceNumber}.pdf"`,
    'Cache-Control': 'no-cache',
  });
});

invoiceRoutes.post('/:invoiceId/void', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);
  const invoiceId = c.req.param('invoiceId');
  const input = await parseJson(c, voidInvoiceSchema);

  const [row] = await ctx.db
    .select({
      invoice: invoices,
      propertyId: rooms.propertyId,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, ctx.organization.id)))
    .limit(1);

  if (!row) fail(404, 'INVOICE_NOT_FOUND', 'Tagihan tidak ditemukan.');
  assertPropertyAccess(ctx, row.propertyId);
  if (row.invoice.status === 'void') {
    fail(409, 'INVOICE_ALREADY_VOID', 'Tagihan sudah dibatalkan.');
  }

  await ctx.db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1)
      .for('update');
    if (!locked) fail(404, 'INVOICE_NOT_FOUND', 'Tagihan tidak ditemukan.');

    const [paid] = await tx
      .select({ amount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
      .where(and(eq(paymentAllocations.invoiceId, invoiceId), eq(payments.status, 'received')));

    if (Number(paid?.amount ?? 0) > 0) {
      fail(
        409,
        'INVOICE_HAS_PAYMENTS',
        'Batalkan pembayaran terlebih dahulu sebelum void tagihan.',
      );
    }

    await tx
      .update(invoices)
      .set({
        status: 'void',
        voidReason: input.reason,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    await writeAudit(tx, ctx, {
      entityType: 'invoice',
      entityId: invoiceId,
      action: 'invoice.voided',
      metadata: { reason: input.reason, invoiceNumber: locked.invoiceNumber },
    });
  });

  return c.json({ data: { id: invoiceId, status: 'void' } });
});
