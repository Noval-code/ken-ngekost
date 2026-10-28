import { createPgDatabase } from '@panggora/database';
import { createApp } from './app';
import { createAuth } from './auth';
import { resolveEnv, type ApiEnv } from './env';
import { runInvoiceScheduler } from './lib/scheduler';

interface WorkerEnv extends ApiEnv {
  HYPERDRIVE?: { connectionString: string };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const resolved = resolveEnv(env, { requireDatabase: true });
    if (!resolved.databaseUrl) {
      return new Response('Database is not configured', { status: 500 });
    }

    const { db, close } = createPgDatabase(resolved.databaseUrl);
    try {
      const auth = createAuth(db, resolved);
      const app = createApp({ db, auth, env: resolved });
      return await app.fetch(request, env);
    } finally {
      await close().catch(() => undefined);
    }
  },

  async scheduled(_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    const resolved = resolveEnv(env, { requireDatabase: true });
    if (!resolved.databaseUrl) return;
    const { db, close } = createPgDatabase(resolved.databaseUrl);
    ctx.waitUntil(
      (async () => {
        try {
          const result = await runInvoiceScheduler(db);
          console.log('[cron] invoice generation', {
            generated: result.generated,
            skipped: result.skipped,
            errors: result.errors.length,
          });
        } catch (error) {
          console.error('[cron] invoice generation failed', error);
        } finally {
          await close().catch(() => undefined);
        }
      })(),
    );
  },
};
