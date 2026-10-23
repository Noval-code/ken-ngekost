import {
  asAppDatabase,
  createPgliteDatabase,
  invoiceItems,
  invoices,
  leases,
  migratePglite,
  organizations,
  properties,
  rooms,
  tenants,
  users,
} from '@kost/database';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runInvoiceScheduler } from '../src/lib/scheduler';

const database = createPgliteDatabase('memory://');
const db = asAppDatabase(database.db);
const userId = randomUUID();
let shortLeaseId = '';

beforeAll(async () => {
  await migratePglite(database.db, resolve(process.cwd(), '../../drizzle'));

  await db.insert(users).values({
    id: userId,
    name: 'Scheduler Test Owner',
    email: 'scheduler@test.local',
  });

  const [organization] = await db
    .insert(organizations)
    .values({ name: 'Scheduler Test Org', ownerUserId: userId })
    .returning();
  if (!organization) throw new Error('Organization insert failed');

  const [property] = await db
    .insert(properties)
    .values({
      organizationId: organization.id,
      name: 'Scheduler Test Property',
      address: 'Test Address',
    })
    .returning();
  if (!property) throw new Error('Property insert failed');

  const [room] = await db
    .insert(rooms)
    .values({
      organizationId: organization.id,
      propertyId: property.id,
      roomNumber: 'T-01',
      baseRent: '1500000.00',
    })
    .returning();
  if (!room) throw new Error('Room insert failed');

  const [tenant] = await db
    .insert(tenants)
    .values({
      organizationId: organization.id,
      name: 'Scheduler Tenant',
      phone: '080000000000',
    })
    .returning();
  if (!tenant) throw new Error('Tenant insert failed');

  await db.insert(leases).values({
    organizationId: organization.id,
    roomId: room.id,
    tenantId: tenant.id,
    startDate: '2026-01-31',
    endDate: '2026-12-31',
    rentAmount: '1500000.00',
    billingAnchorDay: 31,
    createdBy: userId,
  });

  const [shortRoom] = await db
    .insert(rooms)
    .values({
      organizationId: organization.id,
      propertyId: property.id,
      roomNumber: 'T-02',
      baseRent: '1500000.00',
    })
    .returning();
  if (!shortRoom) throw new Error('Short lease room insert failed');

  const [shortLease] = await db
    .insert(leases)
    .values({
      organizationId: organization.id,
      roomId: shortRoom.id,
      tenantId: tenant.id,
      startDate: '2026-01-31',
      endDate: '2026-02-28',
      rentAmount: '1500000.00',
      billingAnchorDay: 31,
      createdBy: userId,
    })
    .returning();
  if (!shortLease) throw new Error('Short lease insert failed');
  shortLeaseId = shortLease.id;
});

afterAll(async () => {
  await database.close();
});

describe('runInvoiceScheduler', () => {
  it('generates due invoices, closes expired leases, and is idempotent', async () => {
    const first = await runInvoiceScheduler(db, { today: '2026-03-01' });
    expect(first.generated).toBe(3);
    expect(first.closedLeases).toBe(1);
    expect(first.errors).toEqual([]);

    const rows = await db.select().from(invoices);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.periodStart).sort()).toEqual([
      '2026-01-31',
      '2026-01-31',
      '2026-02-28',
    ]);

    const items = await db.select().from(invoiceItems);
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.amount === '1500000.00')).toBe(true);

    const [shortLease] = await db.select().from(leases).where(eq(leases.id, shortLeaseId));
    expect(shortLease?.status).toBe('ended');
    expect(shortLease?.endedAt).not.toBeNull();

    const second = await runInvoiceScheduler(db, { today: '2026-03-01' });
    expect(second.generated).toBe(0);
    expect(second.closedLeases).toBe(0);
    expect(second.skipped).toBe(2);
    expect(await db.select().from(invoices)).toHaveLength(3);
  });
});
