import { invoices, leases, properties, rooms, tenants } from '@kost/database';
import { dashboardQuery } from '@kost/validation';
import { monthRange, todayIso } from '@kost/shared';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { assertPropertyAccess } from '../lib/access';
import { parseQuery } from '../lib/http';
import { buildReport, getTotalOutstanding, recentPayments } from '../lib/reporting';
import { qualifiedColumn } from '../lib/sql';
import type { AppVariables } from '../types';

export const dashboardRoutes = new Hono<{ Variables: AppVariables }>();

dashboardRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, dashboardQuery);
  const defaults = monthRange(todayIso().slice(0, 7));
  const from = query.from ?? defaults.start;
  const to = query.to ?? defaults.end;
  if (query.propertyId) assertPropertyAccess(ctx, query.propertyId);

  const report = await buildReport(ctx, { from, to, propertyId: query.propertyId });
  const outstanding = await getTotalOutstanding(ctx, query.propertyId);
  const recent = await recentPayments(ctx, 6, query.propertyId);

  const dueConditions = [
    eq(invoices.organizationId, ctx.organization.id),
    eq(invoices.status, 'issued'),
    sql`${invoices.dueDate} <= current_date`,
    sql`(${invoices.totalAmount} - coalesce((
      select sum(pa.amount) from payment_allocations pa
      join payments p on p.id = pa.payment_id
      where pa.invoice_id = ${qualifiedColumn(invoices.id)} and p.status = 'received'
    ), 0)) > 0`,
  ];
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      dueConditions.push(sql`false`);
    } else {
      dueConditions.push(
        sql`exists (
          select 1 from leases l join rooms r on r.id = l.room_id
          where l.id = ${invoices.leaseId}
            and r.property_id in (${sql.join(
              ctx.accessiblePropertyIds.map((id) => sql`${id}`),
              sql`, `,
            )})
        )`,
      );
    }
  }
  if (query.propertyId) {
    dueConditions.push(
      sql`exists (
        select 1 from leases l join rooms r on r.id = l.room_id
        where l.id = ${invoices.leaseId} and r.property_id = ${query.propertyId}
      )`,
    );
  }

  const dueInvoices = await ctx.db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      dueDate: invoices.dueDate,
      totalAmount: invoices.totalAmount,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      tenantName: tenants.name,
      balance: sql<string>`(${invoices.totalAmount} - coalesce((
        select sum(pa.amount) from payment_allocations pa
        join payments p on p.id = pa.payment_id
        where pa.invoice_id = ${invoices.id} and p.status = 'received'
      ), 0))`,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(tenants, eq(tenants.id, leases.tenantId))
    .where(and(...dueConditions))
    .orderBy(invoices.dueDate)
    .limit(6);

  return c.json({
    data: {
      period: { from, to },
      totals: {
        ...report.totals,
        outstandingAll: outstanding.outstanding,
        overdueAll: outstanding.overdue,
      },
      properties: report.properties,
      recentPayments: recent,
      dueInvoices,
      definitions: {
        cashReceipts: 'Uang yang benar-benar diterima pada periode berdasarkan tanggal pembayaran.',
        invoicesIssued:
          'Total nilai invoice yang diterbitkan untuk periode sewa dalam rentang laporan.',
        outstanding: 'Saldo tagihan yang belum dibayar untuk invoice dalam rentang laporan.',
        overdue: 'Saldo tagihan dalam rentang laporan yang sudah melewati jatuh tempo.',
        netCash: 'Penerimaan kas dikurangi pengeluaran. Deposit tidak dihitung sebagai pendapatan.',
      },
    },
  });
});
