import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { AppDatabase } from '@panggora/database';
import { schema } from '@panggora/database';
import { betterAuth } from 'better-auth';
import type { ResolvedEnv } from './env';

export function createAuth(db: AppDatabase, env: ResolvedEnv) {
  return betterAuth({
    appName: 'Panggora',
    secret: env.authSecret,
    baseURL: env.authUrl,
    basePath: '/api/auth',
    trustedOrigins: env.corsOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    user: {
      modelName: 'users',
      additionalFields: {
        status: {
          type: 'string',
          required: false,
          defaultValue: 'active',
          input: false,
          returned: true,
        },
      },
    },
    session: {
      modelName: 'sessions',
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: 'accounts',
    },
    verification: {
      modelName: 'verifications',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
      useSecureCookies: env.secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.secureCookies,
      },
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
