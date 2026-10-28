import {
  organizationMembers,
  organizations,
  properties,
  propertyAssignments,
} from '@panggora/database';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Context, MiddlewareHandler } from 'hono';
import type { OrgRole } from '@panggora/shared';
import type { AppVariables, RequestContext } from '../types';
import { fail } from './http';

export type AppContext = Context<{ Variables: AppVariables }>;

export const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    fail(401, 'UNAUTHENTICATED', 'Sesi tidak valid atau sudah berakhir.');
  }

  const [user] = await db
    .select({
      id: sql<string>`u.id`,
      name: sql<string>`u.name`,
      email: sql<string>`u.email`,
      status: sql<string>`u.status`,
    })
    .from(sql`users u`)
    .where(sql`u.id = ${session.user.id}`)
    .limit(1);

  if (!user || user.status !== 'active') {
    fail(403, 'ACCOUNT_INACTIVE', 'Akun tidak aktif.');
  }

  const memberships = await db
    .select({
      membership: organizationMembers,
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.status, 'active')));

  if (memberships.length === 0) {
    fail(403, 'NO_ORGANIZATION', 'Akun belum tergabung dalam organisasi.');
  }

  const requestedOrgId = c.req.header('x-organization-id') ?? c.req.query('organizationId');
  const selected = requestedOrgId
    ? memberships.find((item) => item.organization.id === requestedOrgId)
    : memberships[0];

  if (!selected) {
    fail(403, 'ORGANIZATION_FORBIDDEN', 'Anda tidak memiliki akses ke organisasi tersebut.');
  }

  let accessiblePropertyIds: string[] | null = null;
  if (selected.membership.role === 'manager') {
    const assignments = await db
      .select({ propertyId: propertyAssignments.propertyId })
      .from(propertyAssignments)
      .innerJoin(properties, eq(properties.id, propertyAssignments.propertyId))
      .where(
        and(
          eq(propertyAssignments.organizationMemberId, selected.membership.id),
          eq(properties.organizationId, selected.organization.id),
        ),
      );
    accessiblePropertyIds = assignments.map((row) => row.propertyId);
  }

  const ctx: RequestContext = {
    db,
    auth,
    user,
    sessionId: session.session.id,
    organization: selected.organization,
    membership: selected.membership,
    accessiblePropertyIds,
  };
  c.set('ctx', ctx);
  await next();
};

export function requireRole(ctx: RequestContext, roles: OrgRole[]): void {
  if (!roles.includes(ctx.membership.role as OrgRole)) {
    fail(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.');
  }
}

export function assertPropertyAccess(ctx: RequestContext, propertyId: string): void {
  if (ctx.accessiblePropertyIds !== null && !ctx.accessiblePropertyIds.includes(propertyId)) {
    fail(403, 'PROPERTY_FORBIDDEN', 'Anda tidak memiliki akses ke properti ini.');
  }
}

export function propertyScopeFilter(ctx: RequestContext): string[] | null {
  return ctx.accessiblePropertyIds;
}

export async function getAssignedPropertyIds(
  db: RequestContext['db'],
  memberId: string,
): Promise<string[]> {
  const rows = await db
    .select({ propertyId: propertyAssignments.propertyId })
    .from(propertyAssignments)
    .where(eq(propertyAssignments.organizationMemberId, memberId));
  return rows.map((row) => row.propertyId);
}

export async function assertPropertiesInOrganization(
  db: RequestContext['db'],
  organizationId: string,
  propertyIds: string[],
): Promise<void> {
  if (propertyIds.length === 0) return;
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.organizationId, organizationId), inArray(properties.id, propertyIds)));
  if (rows.length !== new Set(propertyIds).size) {
    fail(400, 'INVALID_PROPERTY', 'Satu atau lebih properti tidak ditemukan dalam organisasi.');
  }
}
