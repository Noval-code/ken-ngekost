import type { AppDatabase, Organization, OrganizationMember } from '@panggora/database';
import type { Auth } from './auth';
import type { ApiEnv } from './env';

export type AppBindings = ApiEnv;

type TransactionCallback = Parameters<AppDatabase['transaction']>[0];
export type DbTransaction = Parameters<TransactionCallback>[0];
export type DbExecutor = AppDatabase | DbTransaction;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface RequestContext {
  db: AppDatabase;
  auth: Auth;
  user: AuthUser;
  sessionId: string;
  organization: Organization;
  membership: OrganizationMember;
  accessiblePropertyIds: string[] | null;
}

export interface AppVariables {
  db: AppDatabase;
  auth: Auth;
  ctx: RequestContext;
}

export interface AppOptions {
  db: AppDatabase;
  auth: Auth;
  env: import('./env').ResolvedEnv;
  corsOrigins?: string[];
}
