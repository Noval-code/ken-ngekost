export interface ApiEnv {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  WEB_URL?: string;
  CORS_ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  COOKIE_SECURE?: string;
}

export interface ResolvedEnv {
  databaseUrl: string | null;
  authSecret: string;
  authUrl: string;
  webUrl: string;
  isProduction: boolean;
  secureCookies: boolean;
  corsOrigins: string[];
}

const DEV_SECRET = 'dev-only-secret-change-me-0123456789abcdef';

export function resolveEnv(env: ApiEnv, options: { requireDatabase?: boolean } = {}): ResolvedEnv {
  const isProduction = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';
  const databaseUrl = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL ?? null;

  if (options.requireDatabase && !databaseUrl) {
    throw new Error('Database connection is not configured. Set DATABASE_URL or bind HYPERDRIVE.');
  }

  let authSecret = env.BETTER_AUTH_SECRET ?? '';
  if (!authSecret) {
    if (isProduction) {
      throw new Error('BETTER_AUTH_SECRET must be configured in production.');
    }
    authSecret = DEV_SECRET;
  }
  if (isProduction && authSecret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production.');
  }

  const authUrl = env.BETTER_AUTH_URL ?? 'http://localhost:8787';
  const webUrl = env.WEB_URL ?? 'http://localhost:5173';
  const corsOrigins = [
    webUrl,
    ...(env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  return {
    databaseUrl,
    authSecret,
    authUrl,
    webUrl,
    isProduction,
    secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProduction,
    corsOrigins: [...new Set(corsOrigins)],
  };
}
