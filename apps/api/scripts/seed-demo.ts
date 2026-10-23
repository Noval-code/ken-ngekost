import {
  asAppDatabase,
  createPgliteDatabase,
  createPgDatabase,
  depositTransactions,
  deposits,
  expenseCategories,
  leases,
  migratePglite,
  organizationMembers,
  organizations,
  properties,
  rooms,
  tenants,
} from '@kost/database';
import { addDays, billablePeriods, DEFAULT_EXPENSE_CATEGORIES, todayIso } from '@kost/shared';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createAuth } from '../src/auth';
import { resolveEnv } from '../src/env';
import { createInvoiceForPeriod } from '../src/lib/invoices';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

async function main() {
  const env = resolveEnv({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    WEB_URL: process.env.WEB_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  const usingPg = Boolean(env.databaseUrl);
  const database = usingPg
    ? createPgDatabase(env.databaseUrl!)
    : createPgliteDatabase(resolve(process.cwd(), '.pglite'));

  if (!usingPg) {
    await migratePglite(
      database.db as Awaited<ReturnType<typeof createPgliteDatabase>>['db'],
      resolve(process.cwd(), '../../drizzle'),
    );
  }

  const db = asAppDatabase(database.db);
  const auth = createAuth(db, env);
  const today = todayIso();
  const startDate = addDays(today, -40);

  try {
    const email = process.env.DEMO_EMAIL ?? 'demo@kost.local';
    const password = process.env.DEMO_PASSWORD ?? 'DemoPass12345';
    const result = await auth.api.signUpEmail({
      body: { name: 'Demo Owner', email, password },
    });

    const org = await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({ name: 'Kost Ngekost Demo', ownerUserId: result.user.id, email })
        .returning();
      if (!organization) throw new Error('Organization insert failed');

      await tx.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: result.user.id,
        role: 'owner',
        status: 'active',
      });

      const categories = await tx
        .insert(expenseCategories)
        .values(
          DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
            organizationId: organization.id,
            name: category,
          })),
        )
        .returning();

      const [propertyA, propertyB] = await tx
        .insert(properties)
        .values([
          {
            organizationId: organization.id,
            name: 'Kost Melati',
            address: 'Jl. Melati No. 12, Bandung',
          },
          {
            organizationId: organization.id,
            name: 'Kost Anggrek',
            address: 'Jl. Anggrek No. 8, Bandung',
          },
        ])
        .returning();

      if (!propertyA || !propertyB || !categories[0]) throw new Error('Seed base failed');

      const roomRows = await tx
        .insert(rooms)
        .values([
          {
            organizationId: organization.id,
            propertyId: propertyA.id,
            roomNumber: 'A-01',
            baseRent: '1500000.00',
          },
          {
            organizationId: organization.id,
            propertyId: propertyA.id,
            roomNumber: 'A-02',
            baseRent: '1600000.00',
          },
          {
            organizationId: organization.id,
            propertyId: propertyA.id,
            roomNumber: 'A-03',
            baseRent: '1700000.00',
          },
          {
            organizationId: organization.id,
            propertyId: propertyB.id,
            roomNumber: 'B-01',
            baseRent: '1250000.00',
          },
          {
            organizationId: organization.id,
            propertyId: propertyB.id,
            roomNumber: 'B-02',
            baseRent: '1350000.00',
          },
        ])
        .returning();

      const tenantRows = await tx
        .insert(tenants)
        .values([
          {
            organizationId: organization.id,
            name: 'Rina Pratama',
            phone: '081234567890',
            notes: 'Penghuni demo',
          },
          {
            organizationId: organization.id,
            name: 'Budi Santoso',
            phone: '081298765432',
          },
        ])
        .returning();

      for (let index = 0; index < 2; index += 1) {
        const room = roomRows[index];
        const tenant = tenantRows[index];
        if (!room || !tenant) continue;

        const [lease] = await tx
          .insert(leases)
          .values({
            organizationId: organization.id,
            roomId: room.id,
            tenantId: tenant.id,
            startDate,
            endDate: addDays(startDate, 365),
            rentAmount: room.baseRent,
            billingAnchorDay: Number(startDate.slice(8, 10)),
            depositAmount: '500000.00',
            status: 'active',
            createdBy: result.user.id,
          })
          .returning();
        if (!lease) continue;

        const periods = billablePeriods(lease.startDate, lease.billingAnchorDay, lease.endDate, 2);
        for (const period of periods) {
          if (period.issueDate <= today) {
            await createInvoiceForPeriod(tx, lease, period, { actorUserId: result.user.id });
          }
        }

        const [deposit] = await tx
          .insert(deposits)
          .values({
            organizationId: organization.id,
            leaseId: lease.id,
            amountReceived: '500000.00',
            amountRefunded: '0.00',
            status: 'held',
          })
          .returning();
        if (deposit) {
          await tx.insert(depositTransactions).values({
            depositId: deposit.id,
            type: 'received',
            amount: '500000.00',
            recordedBy: result.user.id,
            notes: 'Deposit demo',
          });
        }
      }

      return organization;
    });

    console.log('Demo seed complete.');
    console.log(`Login: ${email} / ${password}`);
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(usingPg ? 'Database: PostgreSQL' : 'Database: local PGlite');
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
