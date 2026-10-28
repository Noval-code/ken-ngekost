import { notifications, organizationMembers, propertyAssignments } from '@panggora/database';
import type { NotificationType } from '@panggora/shared';
import { formatIdr, formatIndonesianDate } from '@panggora/shared';
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../types';

interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  linkUrl?: string;
}

export async function notifyUser(
  db: DbExecutor,
  organizationId: string,
  userId: string,
  input: NotificationInput,
): Promise<void> {
  await db.insert(notifications).values({
    organizationId,
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? {},
    linkUrl: input.linkUrl ?? null,
  });
}

export async function notifyOrganizationMembers(
  db: DbExecutor,
  organizationId: string,
  input: NotificationInput,
  options: { propertyId?: string } = {},
): Promise<void> {
  let memberUserIds: string[];

  if (options.propertyId) {
    // Notify owners and admins (full access) + managers assigned to this property
    const allMembers = await db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        memberId: organizationMembers.id,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, 'active'),
        ),
      );

    const ownerAdminIds = allMembers
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => m.userId);

    const managerMemberIds = allMembers.filter((m) => m.role === 'manager').map((m) => m.memberId);

    let assignedManagerUserIds: string[] = [];
    if (managerMemberIds.length > 0) {
      const assignments = await db
        .select({ memberId: propertyAssignments.organizationMemberId })
        .from(propertyAssignments)
        .where(eq(propertyAssignments.propertyId, options.propertyId));

      const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
      assignedManagerUserIds = allMembers
        .filter((m) => m.role === 'manager' && assignedMemberIds.has(m.memberId))
        .map((m) => m.userId);
    }

    memberUserIds = [...new Set([...ownerAdminIds, ...assignedManagerUserIds])];
  } else {
    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, 'active'),
        ),
      );
    memberUserIds = members.map((m) => m.userId);
  }

  if (memberUserIds.length === 0) return;

  await db.insert(notifications).values(
    memberUserIds.map((userId) => ({
      organizationId,
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? {},
      linkUrl: input.linkUrl ?? null,
    })),
  );
}

// --- Helper builders for each notification type ---

export function invoiceIssuedNotification(data: {
  tenantName: string;
  roomNumber: string;
  propertyName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  invoiceId: string;
  invoiceNumber: string;
}): NotificationInput {
  return {
    type: 'invoice_issued',
    title: `Tagihan baru: ${data.tenantName}`,
    message: `Invoice ${data.invoiceNumber} untuk kamar ${data.roomNumber} (${data.propertyName}) periode ${formatIndonesianDate(data.periodStart)}–${formatIndonesianDate(data.periodEnd)} sebesar ${formatIdr(data.totalAmount)} telah diterbitkan.`,
    metadata: {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      tenantName: data.tenantName,
      roomNumber: data.roomNumber,
      totalAmount: data.totalAmount,
    },
    linkUrl: `/invoices/${data.invoiceId}`,
  };
}

export function paymentReceivedNotification(data: {
  paymentNumber: string;
  amount: string;
  method: string;
  tenantNames: string;
  paymentId: string;
}): NotificationInput {
  const methodLabel = data.method === 'cash' ? 'tunai' : 'transfer bank';
  return {
    type: 'payment_received',
    title: `Pembayaran diterima: ${data.tenantNames}`,
    message: `Pembayaran ${data.paymentNumber} sebesar ${formatIdr(data.amount)} via ${methodLabel} dari ${data.tenantNames} telah dicatat.`,
    metadata: {
      paymentId: data.paymentId,
      paymentNumber: data.paymentNumber,
      amount: data.amount,
    },
    linkUrl: `/payments/${data.paymentId}`,
  };
}

export function invoiceOverdueNotification(data: {
  tenantName: string;
  roomNumber: string;
  propertyName: string;
  dueDate: string;
  balance: string;
  invoiceId: string;
  invoiceNumber: string;
}): NotificationInput {
  return {
    type: 'invoice_overdue',
    title: `Tunggakan: ${data.tenantName}`,
    message: `Invoice ${data.invoiceNumber} kamar ${data.roomNumber} (${data.propertyName}) jatuh tempo ${formatIndonesianDate(data.dueDate)} dengan sisa ${formatIdr(data.balance)} belum dibayar.`,
    metadata: {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      tenantName: data.tenantName,
      balance: data.balance,
    },
    linkUrl: `/invoices/${data.invoiceId}`,
  };
}

export function leaseExpiringNotification(data: {
  tenantName: string;
  roomNumber: string;
  propertyName: string;
  endDate: string;
  leaseId: string;
  daysLeft: number;
}): NotificationInput {
  return {
    type: 'lease_expiring',
    title: `Kontrak akan berakhir: ${data.tenantName}`,
    message: `Kontrak ${data.tenantName} di kamar ${data.roomNumber} (${data.propertyName}) akan berakhir pada ${formatIndonesianDate(data.endDate)} (${data.daysLeft} hari lagi).`,
    metadata: {
      leaseId: data.leaseId,
      tenantName: data.tenantName,
      roomNumber: data.roomNumber,
      endDate: data.endDate,
    },
    linkUrl: `/leases/${data.leaseId}`,
  };
}

export function leaseEndedNotification(data: {
  tenantName: string;
  roomNumber: string;
  propertyName: string;
  leaseId: string;
}): NotificationInput {
  return {
    type: 'lease_ended',
    title: `Kontrak berakhir: ${data.tenantName}`,
    message: `Kontrak ${data.tenantName} di kamar ${data.roomNumber} (${data.propertyName}) telah berakhir secara otomatis.`,
    metadata: {
      leaseId: data.leaseId,
      tenantName: data.tenantName,
      roomNumber: data.roomNumber,
    },
    linkUrl: `/leases/${data.leaseId}`,
  };
}

export function depositReceivedNotification(data: {
  tenantName: string;
  roomNumber: string;
  amount: string;
  depositId: string;
}): NotificationInput {
  return {
    type: 'deposit_received',
    title: `Deposit diterima: ${data.tenantName}`,
    message: `Deposit sebesar ${formatIdr(data.amount)} dari ${data.tenantName} (kamar ${data.roomNumber}) telah dicatat.`,
    metadata: {
      depositId: data.depositId,
      tenantName: data.tenantName,
      amount: data.amount,
    },
    linkUrl: `/deposits/${data.depositId}`,
  };
}

export function depositRefundedNotification(data: {
  tenantName: string;
  roomNumber: string;
  amount: string;
  depositId: string;
}): NotificationInput {
  return {
    type: 'deposit_refunded',
    title: `Deposit direfund: ${data.tenantName}`,
    message: `Refund deposit sebesar ${formatIdr(data.amount)} untuk ${data.tenantName} (kamar ${data.roomNumber}) telah dicatat.`,
    metadata: {
      depositId: data.depositId,
      tenantName: data.tenantName,
      amount: data.amount,
    },
    linkUrl: `/deposits/${data.depositId}`,
  };
}
