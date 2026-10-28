import {
  createPgDatabase,
  expenseCategories,
  organizationMembers,
  organizations,
  users,
} from '@panggora/database';
import { DEFAULT_EXPENSE_CATEGORIES } from '@panggora/shared';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createAuth } from '../src/auth';
import { resolveEnv } from '../src/env';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required for bootstrap. Use `pnpm seed:demo` for the local PGlite database.',
    );
  }

  const env = resolveEnv(
    {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      WEB_URL: process.env.WEB_URL,
      NODE_ENV: process.env.NODE_ENV,
      COOKIE_SECURE: process.env.COOKIE_SECURE,
    },
    { requireDatabase: true },
  );

  const name = process.env.BOOTSTRAP_NAME?.trim();
  const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;
  const orgName = process.env.BOOTSTRAP_ORG?.trim();

  if (!name || !email || !password || !orgName) {
    throw new Error(
      'Set BOOTSTRAP_NAME, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD, and BOOTSTRAP_ORG environment variables.',
    );
  }
  if (password.length < 12) throw new Error('BOOTSTRAP_PASSWORD must be at least 12 characters.');

  const { db, close } = createPgDatabase(databaseUrl);
  const auth = createAuth(db, env);

  try {
    const [existing] = await db.select({ id: users.id }).from(users).limit(1);
    if (existing) {
      throw new Error(
        'Users already exist. Bootstrap is only allowed for a fresh database. Create staff from the app.',
      );
    }

    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    const inserted = await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: orgName,
          ownerUserId: result.user.id,
          email,
        })
        .returning();
      if (!organization) throw new Error('Unable to create organization');

      await tx.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: result.user.id,
        role: 'owner',
        status: 'active',
      });

      await tx.insert(expenseCategories).values(
        DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
          organizationId: organization.id,
          name: category,
        })),
      );

      return organization;
    });

    console.log('Bootstrap complete.');
    console.log(`User: ${result.user.email} (${result.user.id})`);
    console.log(`Organization: ${inserted.name} (${inserted.id})`);
    console.log('Remove BOOTSTRAP_PASSWORD from your environment/shell history.');
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
