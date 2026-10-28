import {
  invoices,
  leases,
  organizations,
  properties,
  rooms,
  scheduledJobRuns,
  tenants,
} from '@panggora/database';
import type { AppDatabase } from '@panggora/database';
import { isPeriodBillable, periodAt, todayIso } from '@panggora/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { createInvoiceForPeriod } from './invoices';
import {
  notifyOrganizationMembers,
  invoiceIssuedNotification,
  leaseExpiringNotification,
  leaseEndedNotification,
} from './notifications';

export const INVOICE_JOB_NAME = 'invoice-generation';

export interface SchedulerResult {
  jobRunId: string;
  generated: number;
  skipped: number;
  closedLeases: number;
  errors: Array<{ leaseId: string; message: string }>;
  checkedLeases: number;
}

export async function runInvoiceScheduler(
  db: AppDatabase,
  options: { today?: string; organizationId?: string } = {},
): Promise<SchedulerResult> {
  const today = options.today ?? todayIso();
  const [jobRun] = await db
    .insert(scheduledJobRuns)
    .values({
      jobName: INVOICE_JOB_NAME,
      status: 'running',
      summary: { today, organizationId: options.organizationId ?? null },
    })
    .returning();

  if (!jobRun) throw new Error('Unable to create scheduler run record');

  const summary: SchedulerResult = {
    jobRunId: jobRun.id,
    generated: 0,
    skipped: 0,
    closedLeases: 0,
    errors: [],
    checkedLeases: 0,
  };

  try {
    const conditions = [eq(leases.status, 'active')];
    if (options.organizationId) {
      conditions.push(eq(leases.organizationId, options.organizationId));
    }

    const activeLeases = await db
      .select({
        lease: leases,
        ownerUserId: organizations.ownerUserId,
      })
      .from(leases)
      .innerJoin(organizations, eq(organizations.id, leases.organizationId))
      .where(and(...conditions));

    summary.checkedLeases = activeLeases.length;

    for (const row of activeLeases) {
      const lease = row.lease;
      try {
        const existing = await db
          .select({ periodStart: invoices.periodStart })
          .from(invoices)
          .where(eq(invoices.leaseId, lease.id));
        const existingStarts = new Set(existing.map((item) => item.periodStart));

        for (let index = 0; index < 240; index += 1) {
          if (!isPeriodBillable(lease.startDate, lease.billingAnchorDay, index, lease.endDate)) {
            break;
          }
          const period = periodAt(lease.startDate, lease.billingAnchorDay, index);
          if (period.issueDate > today) break;
          if (existingStarts.has(period.start)) {
            summary.skipped += 1;
            continue;
          }
          const created = await createInvoiceForPeriod(db, lease, period, {
            actorUserId: row.ownerUserId,
          });
          if (created) {
            summary.generated += 1;
            existingStarts.add(period.start);
            try {
              const [tenantInfo] = await db
                .select({ name: tenants.name })
                .from(tenants)
                .where(eq(tenants.id, lease.tenantId))
                .limit(1);
              const [roomInfo] = await db
                .select({ roomNumber: rooms.roomNumber, propertyId: rooms.propertyId })
                .from(rooms)
                .where(eq(rooms.id, lease.roomId))
                .limit(1);
              const [propInfo] = roomInfo
                ? await db
                    .select({ name: properties.name })
                    .from(properties)
                    .where(eq(properties.id, roomInfo.propertyId))
                    .limit(1)
                : [undefined];

              if (tenantInfo && roomInfo) {
                await notifyOrganizationMembers(
                  db,
                  lease.organizationId,
                  invoiceIssuedNotification({
                    tenantName: tenantInfo.name,
                    roomNumber: roomInfo.roomNumber,
                    propertyName: propInfo?.name ?? '',
                    periodStart: period.start,
                    periodEnd: period.end,
                    totalAmount: lease.rentAmount,
                    invoiceId: created.id,
                    invoiceNumber: created.invoiceNumber,
                  }),
                  { propertyId: roomInfo.propertyId },
                );
              }
            } catch {
              // Notification errors should not fail scheduler
            }
          } else {
            summary.skipped += 1;
          }
        }

        // Check if lease is expiring soon (within 7 days)
        if (lease.endDate >= today) {
          const endDateObj = new Date(lease.endDate + 'T00:00:00Z');
          const todayObj = new Date(today + 'T00:00:00Z');
          const daysLeft = Math.round((endDateObj.getTime() - todayObj.getTime()) / (86400 * 1000));
          if (daysLeft > 0 && daysLeft <= 7) {
            try {
              const [tenantInfo] = await db
                .select({ name: tenants.name })
                .from(tenants)
                .where(eq(tenants.id, lease.tenantId))
                .limit(1);
              const [roomInfo] = await db
                .select({ roomNumber: rooms.roomNumber, propertyId: rooms.propertyId })
                .from(rooms)
                .where(eq(rooms.id, lease.roomId))
                .limit(1);
              const [propInfo] = roomInfo
                ? await db
                    .select({ name: properties.name })
                    .from(properties)
                    .where(eq(properties.id, roomInfo.propertyId))
                    .limit(1)
                : [undefined];

              if (tenantInfo && roomInfo) {
                await notifyOrganizationMembers(
                  db,
                  lease.organizationId,
                  leaseExpiringNotification({
                    tenantName: tenantInfo.name,
                    roomNumber: roomInfo.roomNumber,
                    propertyName: propInfo?.name ?? '',
                    endDate: lease.endDate,
                    leaseId: lease.id,
                    daysLeft,
                  }),
                  { propertyId: roomInfo.propertyId },
                );
              }
            } catch {
              // Notification errors should not fail scheduler
            }
          }
        }

        if (lease.endDate < today) {
          const closed = await db
            .update(leases)
            .set({ status: 'ended', endedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(leases.id, lease.id), eq(leases.status, 'active')))
            .returning({ id: leases.id });
          summary.closedLeases += closed.length;

          if (closed.length > 0) {
            try {
              const [tenantInfo] = await db
                .select({ name: tenants.name })
                .from(tenants)
                .where(eq(tenants.id, lease.tenantId))
                .limit(1);
              const [roomInfo] = await db
                .select({ roomNumber: rooms.roomNumber, propertyId: rooms.propertyId })
                .from(rooms)
                .where(eq(rooms.id, lease.roomId))
                .limit(1);
              const [propInfo] = roomInfo
                ? await db
                    .select({ name: properties.name })
                    .from(properties)
                    .where(eq(properties.id, roomInfo.propertyId))
                    .limit(1)
                : [undefined];

              if (tenantInfo && roomInfo) {
                await notifyOrganizationMembers(
                  db,
                  lease.organizationId,
                  leaseEndedNotification({
                    tenantName: tenantInfo.name,
                    roomNumber: roomInfo.roomNumber,
                    propertyName: propInfo?.name ?? '',
                    leaseId: lease.id,
                  }),
                  { propertyId: roomInfo.propertyId },
                );
              }
            } catch {
              // Notification errors should not fail scheduler
            }
          }
        }
      } catch (error) {
        summary.errors.push({
          leaseId: lease.id,
          message: error instanceof Error ? error.message : 'Unknown scheduler error',
        });
      }
    }

    await db
      .update(scheduledJobRuns)
      .set({
        status: 'success',
        finishedAt: new Date(),
        summary: {
          today,
          generated: summary.generated,
          skipped: summary.skipped,
          closedLeases: summary.closedLeases,
          checkedLeases: summary.checkedLeases,
          errors: summary.errors,
        },
      })
      .where(eq(scheduledJobRuns.id, jobRun.id));

    return summary;
  } catch (error) {
    await db
      .update(scheduledJobRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown scheduler error',
      })
      .where(eq(scheduledJobRuns.id, jobRun.id));
    throw error;
  }
}

export async function listSchedulerRuns(db: AppDatabase, limit = 20) {
  return db
    .select()
    .from(scheduledJobRuns)
    .where(eq(scheduledJobRuns.jobName, INVOICE_JOB_NAME))
    .limit(limit);
}

export async function roomNumbersForLeases(db: AppDatabase, leaseIds: string[]) {
  if (leaseIds.length === 0) return [];
  return db
    .select({ leaseId: leases.id, roomNumber: rooms.roomNumber })
    .from(leases)
    .innerJoin(rooms, eq(rooms.id, leases.roomId))
    .where(inArray(leases.id, leaseIds));
}
