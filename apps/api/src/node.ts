import { serve } from '@hono/node-server';
import {
  asAppDatabase,
  createPgliteDatabase,
  createPgDatabase,
  migratePglite,
} from '@panggora/database';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createApp } from './app';
import { createAuth } from './auth';
import { resolveEnv } from './env';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
config({ path: resolve(process.cwd(), '.env'), quiet: true });

const env = resolveEnv({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  WEB_URL: process.env.WEB_URL,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  NODE_ENV: process.env.NODE_ENV,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
});

let database: Awaited<ReturnType<typeof buildDatabase>>;

async function buildDatabase() {
  if (env.databaseUrl) {
    const { db, close } = createPgDatabase(env.databaseUrl);
    return { db, close };
  }

  const { db, close } = createPgliteDatabase(resolve(process.cwd(), '.pglite'));
  const migrationsFolder = resolve(process.cwd(), '../../drizzle');
  await migratePglite(db, migrationsFolder);
  return { db, close };
}

async function main() {
  database = await buildDatabase();
  const db = asAppDatabase(database.db);
  const auth = createAuth(db, env);
  const app = createApp({ db, auth, env });

  const port = Number(process.env.PORT ?? 8787);
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
    if (!env.databaseUrl) {
      console.log('[api] using local PGlite database at apps/api/.pglite');
    }
  });

  const shutdown = async () => {
    server.close();
    await database.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
