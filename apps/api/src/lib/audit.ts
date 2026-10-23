import { auditLogs } from '@kost/database';
import type { RequestContext, DbExecutor } from '../types';

export interface AuditInput {
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface AuditActor {
  organizationId: string;
  actorUserId: string;
}

export async function writeAuditForActor(
  db: DbExecutor,
  actor: AuditActor,
  input: AuditInput,
): Promise<void> {
  await db.insert(auditLogs).values({
    organizationId: actor.organizationId,
    actorUserId: actor.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}

export async function writeAudit(
  db: DbExecutor,
  ctx: Pick<RequestContext, 'organization' | 'user'>,
  input: AuditInput,
): Promise<void> {
  await writeAuditForActor(
    db,
    { organizationId: ctx.organization.id, actorUserId: ctx.user.id },
    input,
  );
}
