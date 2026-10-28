import {
  depositTransactions,
  deposits,
  expenses,
  invoices,
  leases,
  paymentAllocations,
  payments,
  properties,
  rooms,
} from '@panggora/database';
import { addMoney, toMoneyString } from '@panggora/shared';
import { and, eq, inArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import type { RequestContext } from '../types';
import { qualifiedColumn } from './sql';

interface ReportOptions {
  from: string;
  to: string;
  propertyId?: string;
}

interface PropertyReportRow {
  propertyId: string;
  propertyName: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  cashReceipts: string;
  invoicesIssued: string;
  invoicesCount: number;
  outstanding: string;
  overdue: string;
  expenses: string;
  netCash: string;
  depositReceived: string;
  depositRefunded: string;
}

export interface ReportResult {
  period: { from: string; to: string };
  totals: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    cashReceipts: string;
    invoicesIssued: string;
    invoicesCount: number;
    outstanding: string;
    overdue: string;
    expenses: string;
    netCash: string;
    depositReceived: string;
    depositRefunded: string;
  };
  properties: PropertyReportRow[];
}

function propertyCondition(column: AnyColumn, ids: string[] | null): SQL | undefined {
  if (ids === null) return undefined;
  if (ids.length === 0) return sql`false`;
  return inArray(column, ids);
}

function scopeIds(ctx: RequestContext, propertyId?: string): string[] | null {
  if (propertyId) return [propertyId];
  return ctx.accessiblePropertyIds;
}

async function propertyRows(
  ctx: RequestContext,
  options: ReportOptions,
): Promise<PropertyReportRow[]> {
  const ids = scopeIds(ctx, options.propertyId);
  if (ids !== null && ids.length === 0) return [];
  const db = ctx.db;

  const propertyList = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(
      and(
        eq(properties.organizationId, ctx.organization.id),
        propertyCondition(properties.id, ids),
      ),
    )
    .orderBy(properties.name);

  const roomRows = await db
    .select({
      propertyId: rooms.propertyId,
      totalRooms: sql<number>`count(*)::int`,
      occupiedRooms: sql<number>`sum(case when exists (
        select 1 from leases l where l.room_id = ${qualifiedColumn(rooms.id)} and l.status = 'active'
      ) then 1 else 0 end)::int`,
    })
    .from(rooms)
    .where(
      and(
        eq(rooms.organizationId, ctx.organization.id),
        eq(rooms.operationalStatus, 'active'),
        propertyCondition(rooms.propertyId, ids),
      ),
    )
    .groupBy(rooms.propertyId);

  const cashRows = await db
    .select({
      propertyId: rooms.propertyId,
      amount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(
      and(
        eq(payments.organizationId, ctx.organization.id),
        eq(payments.status, 'received'),
        sql`${payments.paidAt} between ${options.from} and ${options.to}`,
        propertyCondition(rooms.propertyId, ids),
      ),
    )
    .groupBy(rooms.propertyId);

  const paidSubquery = db
    .select({
      invoiceId: paymentAllocations.invoiceId,
      paid: sql<string>`sum(${paymentAllocations.amount})`.as('paid'),
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .where(eq(payments.status, 'received'))
    .groupBy(paymentAllocations.invoiceId)
    .as('paid_invoice');

  const invoiceRows = await db
    .select({
      propertyId: rooms.propertyId,
      issued: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
      invoiceCount: sql<number>`count(*)::int`,
      outstanding: sql<string>`coalesce(sum(greatest(${invoices.totalAmount} - coalesce(${paidSubquery.paid}, 0), 0)), 0)`,
      overdue: sql<string>`coalesce(sum(case when ${invoices.dueDate} < current_date then greatest(${invoices.totalAmount} - coalesce(${paidSubquery.paid}, 0), 0) else 0 end), 0)`,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .leftJoin(paidSubquery, eq(paidSubquery.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.organizationId, ctx.organization.id),
        eq(invoices.status, 'issued'),
        sql`${invoices.periodStart} between ${options.from} and ${options.to}`,
        propertyCondition(rooms.propertyId, ids),
      ),
    )
    .groupBy(rooms.propertyId);

  const expenseRows = await db
    .select({
      propertyId: expenses.propertyId,
      amount: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.organizationId, ctx.organization.id),
        sql`${expenses.expenseDate} between ${options.from} and ${options.to}`,
        propertyCondition(expenses.propertyId, ids),
      ),
    )
    .groupBy(expenses.propertyId);

  const depositRows = await db
    .select({
      propertyId: rooms.propertyId,
      type: depositTransactions.type,
      amount: sql<string>`coalesce(sum(${depositTransactions.amount}), 0)`,
    })
    .from(depositTransactions)
    .innerJoin(deposits, eq(deposits.id, depositTransactions.depositId))
    .innerJoin(leases, eq(leases.id, deposits.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(
      and(
        eq(deposits.organizationId, ctx.organization.id),
        sql`${depositTransactions.createdAt}::date between ${options.from} and ${options.to}`,
        propertyCondition(rooms.propertyId, ids),
      ),
    )
    .groupBy(rooms.propertyId, depositTransactions.type);

  const roomMap = new Map(roomRows.map((row) => [row.propertyId, row]));
  const cashMap = new Map(cashRows.map((row) => [row.propertyId, row.amount]));
  const invoiceMap = new Map(invoiceRows.map((row) => [row.propertyId, row]));
  const expenseMap = new Map(expenseRows.map((row) => [row.propertyId, row.amount]));
  const depositMap = new Map<string, { received: string; refunded: string }>();
  for (const row of depositRows) {
    const current = depositMap.get(row.propertyId) ?? { received: '0', refunded: '0' };
    if (row.type === 'received') current.received = row.amount;
    if (row.type === 'refunded') current.refunded = row.amount;
    depositMap.set(row.propertyId, current);
  }

  return propertyList.map((property) => {
    const room = roomMap.get(property.id);
    const invoice = invoiceMap.get(property.id);
    const cash = cashMap.get(property.id) ?? '0';
    const expense = expenseMap.get(property.id) ?? '0';
    const deposit = depositMap.get(property.id) ?? { received: '0', refunded: '0' };
    const totalRooms = Number(room?.totalRooms ?? 0);
    const occupiedRooms = Number(room?.occupiedRooms ?? 0);
    return {
      propertyId: property.id,
      propertyName: property.name,
      totalRooms,
      occupiedRooms,
      vacantRooms: totalRooms - occupiedRooms,
      occupancyRate: totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100),
      cashReceipts: toMoneyString(cash),
      invoicesIssued: toMoneyString(invoice?.issued ?? '0'),
      invoicesCount: Number(invoice?.invoiceCount ?? 0),
      outstanding: toMoneyString(invoice?.outstanding ?? '0'),
      overdue: toMoneyString(invoice?.overdue ?? '0'),
      expenses: toMoneyString(expense),
      netCash: addMoney(cash, `-${expense}`),
      depositReceived: toMoneyString(deposit.received),
      depositRefunded: toMoneyString(deposit.refunded),
    };
  });
}

export async function buildReport(
  ctx: RequestContext,
  options: ReportOptions,
): Promise<ReportResult> {
  const rows = await propertyRows(ctx, options);
  const totals = rows.reduce(
    (acc, row) => ({
      totalRooms: acc.totalRooms + row.totalRooms,
      occupiedRooms: acc.occupiedRooms + row.occupiedRooms,
      vacantRooms: acc.vacantRooms + row.vacantRooms,
      cashReceipts: addMoney(acc.cashReceipts, row.cashReceipts),
      invoicesIssued: addMoney(acc.invoicesIssued, row.invoicesIssued),
      invoicesCount: acc.invoicesCount + row.invoicesCount,
      outstanding: addMoney(acc.outstanding, row.outstanding),
      overdue: addMoney(acc.overdue, row.overdue),
      expenses: addMoney(acc.expenses, row.expenses),
      netCash: addMoney(acc.netCash, row.netCash),
      depositReceived: addMoney(acc.depositReceived, row.depositReceived),
      depositRefunded: addMoney(acc.depositRefunded, row.depositRefunded),
    }),
    {
      totalRooms: 0,
      occupiedRooms: 0,
      vacantRooms: 0,
      cashReceipts: '0.00',
      invoicesIssued: '0.00',
      invoicesCount: 0,
      outstanding: '0.00',
      overdue: '0.00',
      expenses: '0.00',
      netCash: '0.00',
      depositReceived: '0.00',
      depositRefunded: '0.00',
    },
  );

  return {
    period: { from: options.from, to: options.to },
    totals: {
      ...totals,
      occupancyRate:
        totals.totalRooms === 0 ? 0 : Math.round((totals.occupiedRooms / totals.totalRooms) * 100),
    },
    properties: rows,
  };
}

export async function getTotalOutstanding(
  ctx: RequestContext,
  propertyId?: string,
): Promise<{ outstanding: string; overdue: string }> {
  const ids = scopeIds(ctx, propertyId);
  if (ids !== null && ids.length === 0) {
    return { outstanding: '0.00', overdue: '0.00' };
  }
  const paidSubquery = ctx.db
    .select({
      invoiceId: paymentAllocations.invoiceId,
      paid: sql<string>`sum(${paymentAllocations.amount})`.as('paid'),
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .where(eq(payments.status, 'received'))
    .groupBy(paymentAllocations.invoiceId)
    .as('paid_invoice');

  const [row] = await ctx.db
    .select({
      outstanding: sql<string>`coalesce(sum(greatest(${invoices.totalAmount} - coalesce(${paidSubquery.paid}, 0), 0)), 0)`,
      overdue: sql<string>`coalesce(sum(case when ${invoices.dueDate} < current_date then greatest(${invoices.totalAmount} - coalesce(${paidSubquery.paid}, 0), 0) else 0 end), 0)`,
    })
    .from(invoices)
    .innerJoin(leases, eq(leases.id, invoices.leaseId))
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .leftJoin(paidSubquery, eq(paidSubquery.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.organizationId, ctx.organization.id),
        eq(invoices.status, 'issued'),
        propertyCondition(rooms.propertyId, ids),
      ),
    );

  return {
    outstanding: toMoneyString(row?.outstanding ?? '0'),
    overdue: toMoneyString(row?.overdue ?? '0'),
  };
}

export async function recentPayments(ctx: RequestContext, limit = 5, propertyId?: string) {
  const ids = scopeIds(ctx, propertyId);
  if (ids !== null && ids.length === 0) return [];
  const scopeCondition =
    ids === null
      ? undefined
      : sql`exists (
          select 1 from payment_allocations pa
          join invoices i on i.id = pa.invoice_id
          join leases l on l.id = i.lease_id
          join rooms r on r.id = l.room_id
          where pa.payment_id = ${qualifiedColumn(payments.id)}
            and r.property_id in (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )})
        )`;

  return ctx.db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      amount: payments.amount,
      method: payments.method,
      paidAt: payments.paidAt,
      status: payments.status,
      tenantNames: sql<string>`coalesce((
        select string_agg(distinct t.name, ', ')
        from payment_allocations pa
        join invoices i on i.id = pa.invoice_id
        join leases l on l.id = i.lease_id
        join tenants t on t.id = l.tenant_id
        join rooms r on r.id = l.room_id
        where pa.payment_id = ${qualifiedColumn(payments.id)}
        ${propertyId ? sql`and r.property_id = ${propertyId}` : sql``}
      ), '')`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, ctx.organization.id),
        eq(payments.status, 'received'),
        scopeCondition,
      ),
    )
    .orderBy(sql`${payments.paidAt} desc, ${payments.createdAt} desc`)
    .limit(limit);
}
