import {
  asAppDatabase,
  createPgliteDatabase,
  migratePglite,
  notifications,
  organizationMembers,
  organizations,
  users,
} from '@panggora/database';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  notifyOrganizationMembers,
  notifyUser,
  invoiceIssuedNotification,
  paymentReceivedNotification,
} from '../src/lib/notifications';

const database = createPgliteDatabase('memory://');
const db = asAppDatabase(database.db);
const ownerId = randomUUID();
const managerId = randomUUID();
let orgId = '';

beforeAll(async () => {
  await migratePglite(database.db, resolve(process.cwd(), '../../drizzle'));

  await db.insert(users).values([
    { id: ownerId, name: 'Notification Owner', email: 'owner@notif.test' },
    { id: managerId, name: 'Notification Manager', email: 'manager@notif.test' },
  ]);

  const [org] = await db
    .insert(organizations)
    .values({ name: 'Notification Test Org', ownerUserId: ownerId })
    .returning();
  if (!org) throw new Error('Org insert failed');
  orgId = org.id;

  await db.insert(organizationMembers).values([
    { organizationId: orgId, userId: ownerId, role: 'owner', status: 'active' },
    { organizationId: orgId, userId: managerId, role: 'manager', status: 'active' },
  ]);
});

afterAll(async () => {
  await database.close();
});

describe('notification service', () => {
  it('creates direct notification for a specific user', async () => {
    await notifyUser(db, orgId, ownerId, {
      type: 'system',
      title: 'Selamat datang',
      message: 'Sistem notifikasi berhasil diinisialisasi.',
    });

    const userNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerId), eq(notifications.organizationId, orgId)));

    expect(userNotifs).toHaveLength(1);
    expect(userNotifs[0]?.title).toBe('Selamat datang');
    expect(userNotifs[0]?.readAt).toBeNull();
  });

  it('broadcasts notifications to all active organization members', async () => {
    await notifyOrganizationMembers(
      db,
      orgId,
      invoiceIssuedNotification({
        tenantName: 'Budi Santoso',
        roomNumber: 'A-01',
        propertyName: 'Kost Mawar',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        totalAmount: '1500000.00',
        invoiceId: randomUUID(),
        invoiceNumber: 'INV-202603-001',
      }),
    );

    const ownerNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerId), eq(notifications.type, 'invoice_issued')));
    const managerNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, managerId), eq(notifications.type, 'invoice_issued')));

    expect(ownerNotifs).toHaveLength(1);
    expect(managerNotifs).toHaveLength(1);
    expect(ownerNotifs[0]?.title).toContain('Budi Santoso');
  });

  it('marks notifications as read', async () => {
    const unreadBefore = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerId), isNull(notifications.readAt)));
    expect(unreadBefore.length).toBeGreaterThan(0);

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, ownerId), isNull(notifications.readAt)));

    const unreadAfter = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ownerId), isNull(notifications.readAt)));
    expect(unreadAfter).toHaveLength(0);
  });
});
