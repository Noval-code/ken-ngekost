import { invoiceItems, invoices, leases, rooms } from '@kost/database';
import type { BillingPeriod } from '@kost/shared';
import { formatIndonesianDate } from '@kost/shared';
import { eq } from 'drizzle-orm';
import type { DbExecutor } from '../types';
import { writeAuditForActor } from './audit';

export function invoiceNumberFor(leaseId: string, periodStart: string): string {
  return `INV-${periodStart.replaceAll('-', '').slice(0, 6)}-${leaseId.slice(0, 8).toUpperCase()}`;
}

export async function createInvoiceForPeriod(
  db: DbExecutor,
  lease: typeof leases.$inferSelect,
  period: BillingPeriod,
  options: { actorUserId?: string; issuedAt?: Date } = {},
): Promise<typeof invoices.$inferSelect | null> {
  const inserted = await db
    .insert(invoices)
    .values({
      organizationId: lease.organizationId,
      leaseId: lease.id,
      invoiceNumber: invoiceNumberFor(lease.id, period.start),
      periodStart: period.start,
      periodEnd: period.end,
      issuedAt: options.issuedAt ?? new Date(),
      dueDate: period.dueDate,
      subtotal: lease.rentAmount,
      totalAmount: lease.rentAmount,
      status: 'issued',
    })
    .onConflictDoNothing({ target: [invoices.leaseId, invoices.periodStart] })
    .returning();

  const invoice = inserted[0];
  if (!invoice) return null;

  const [room] = await db
    .select({ roomNumber: rooms.roomNumber })
    .from(rooms)
    .where(eq(rooms.id, lease.roomId))
    .limit(1);

  await db.insert(invoiceItems).values({
    invoiceId: invoice.id,
    description: `Sewa kamar ${room?.roomNumber ?? ''} periode ${formatIndonesianDate(
      period.start,
    )} - ${formatIndonesianDate(period.end)}`,
    quantity: '1.00',
    unitPrice: lease.rentAmount,
    amount: lease.rentAmount,
  });

  if (options.actorUserId) {
    await writeAuditForActor(
      db,
      { organizationId: lease.organizationId, actorUserId: options.actorUserId },
      {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'invoice.issued',
        metadata: {
          leaseId: lease.id,
          periodStart: period.start,
          periodEnd: period.end,
          totalAmount: lease.rentAmount,
          source: options.actorUserId ? 'manual-or-activation' : 'scheduler',
        },
      },
    );
  }

  return invoice;
}
