import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type PgDatabase = NodePgDatabase<typeof schema> & { $client: Pool };
export type TestDatabase = PgliteDatabase<typeof schema> & { $client: PGlite };
export type AppDatabase = NodePgDatabase<typeof schema>;

export function createPgDatabase(connectionString: string): {
  db: PgDatabase;
  close: () => Promise<void>;
} {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzlePg(pool, { schema }) as PgDatabase;
  return {
    db,
    close: () => pool.end(),
  };
}

export function createPgliteDatabase(dataDir = 'memory://'): {
  db: TestDatabase;
  close: () => Promise<void>;
} {
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema }) as TestDatabase;
  return {
    db,
    close: () => client.close(),
  };
}

export async function migratePglite(db: PgliteDatabase<typeof schema>, migrationsFolder: string) {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db, { migrationsFolder });
}

export function asAppDatabase(db: PgDatabase | TestDatabase): AppDatabase {
  return db as unknown as AppDatabase;
}
