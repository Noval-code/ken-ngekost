import { organizationMembers, propertyAssignments, users } from '@panggora/database';
import { createMemberSchema, updateMemberSchema } from '@panggora/validation';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { assertPropertiesInOrganization, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, parseJson } from '../lib/http';
import type { AppVariables } from '../types';

export const memberRoutes = new Hono<{ Variables: AppVariables }>();

memberRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);

  const members = await ctx.db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      status: organizationMembers.status,
      createdAt: organizationMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, ctx.organization.id));

  const assignments = await ctx.db
    .select({
      organizationMemberId: propertyAssignments.organizationMemberId,
      propertyId: propertyAssignments.propertyId,
    })
    .from(propertyAssignments)
    .where(
      inArray(
        propertyAssignments.organizationMemberId,
        members.map((member) => member.id),
      ),
    );

  const assignmentMap = new Map<string, string[]>();
  for (const assignment of assignments) {
    const list = assignmentMap.get(assignment.organizationMemberId) ?? [];
    list.push(assignment.propertyId);
    assignmentMap.set(assignment.organizationMemberId, list);
  }

  return c.json({
    data: members.map((member) => ({
      ...member,
      propertyIds: assignmentMap.get(member.id) ?? [],
    })),
  });
});

memberRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner']);
  const input = await parseJson(c, createMemberSchema);

  if (input.role === 'owner') {
    fail(400, 'OWNER_ROLE_RESERVED', 'Hanya ada satu owner pada organisasi ini.');
  }
  if (input.role === 'manager') {
    await assertPropertiesInOrganization(ctx.db, ctx.organization.id, input.propertyIds);
  }

  let createdUserId: string | null = null;
  try {
    const result = await ctx.auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
    });
    createdUserId = result.user.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.toLowerCase().includes('exist')) {
      fail(409, 'EMAIL_EXISTS', 'Email tersebut sudah terdaftar.');
    }
    fail(400, 'MEMBER_CREATE_FAILED', 'Akun anggota gagal dibuat.');
  }

  try {
    const member = await ctx.db.transaction(async (tx) => {
      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: ctx.organization.id,
          userId: createdUserId!,
          role: input.role,
          status: 'active',
        })
        .returning();

      if (!membership) throw new Error('Membership insert failed');

      if (input.role === 'manager' && input.propertyIds.length > 0) {
        await tx.insert(propertyAssignments).values(
          input.propertyIds.map((propertyId) => ({
            propertyId,
            organizationMemberId: membership.id,
          })),
        );
      }

      await writeAudit(tx, ctx, {
        entityType: 'organization_member',
        entityId: membership.id,
        action: 'member.created',
        metadata: {
          userId: createdUserId,
          email: input.email,
          role: input.role,
          propertyIds: input.propertyIds,
        },
      });
      return membership;
    });

    return c.json({ data: member }, 201);
  } catch (error) {
    if (createdUserId) {
      await ctx.db.delete(users).where(eq(users.id, createdUserId));
    }
    if (error instanceof Error && error.message.includes('duplicate')) {
      fail(409, 'MEMBERSHIP_EXISTS', 'Pengguna sudah menjadi anggota organisasi.');
    }
    throw error;
  }
});

memberRoutes.patch('/:memberId', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner']);
  const memberId = c.req.param('memberId');
  const input = await parseJson(c, updateMemberSchema);

  if (input.role === 'owner') {
    fail(400, 'OWNER_ROLE_RESERVED', 'Hanya ada satu owner pada organisasi ini.');
  }

  const [member] = await ctx.db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);

  if (!member) fail(404, 'MEMBER_NOT_FOUND', 'Anggota tidak ditemukan.');
  if (member.userId === ctx.organization.ownerUserId) {
    fail(400, 'OWNER_PROTECTED', 'Owner organisasi tidak dapat diubah melalui endpoint ini.');
  }

  const nextRole = input.role ?? member.role;
  const propertyIds = input.propertyIds;
  if (nextRole === 'manager' && propertyIds) {
    await assertPropertiesInOrganization(ctx.db, ctx.organization.id, propertyIds);
  }

  await ctx.db.transaction(async (tx) => {
    await tx
      .update(organizationMembers)
      .set({
        role: nextRole,
        status: input.status ?? member.status,
      })
      .where(eq(organizationMembers.id, memberId));

    if (propertyIds !== undefined || nextRole !== 'manager') {
      await tx
        .delete(propertyAssignments)
        .where(eq(propertyAssignments.organizationMemberId, memberId));
      if (nextRole === 'manager' && propertyIds && propertyIds.length > 0) {
        await tx.insert(propertyAssignments).values(
          propertyIds.map((propertyId) => ({
            propertyId,
            organizationMemberId: memberId,
          })),
        );
      }
    }

    await writeAudit(tx, ctx, {
      entityType: 'organization_member',
      entityId: memberId,
      action: 'member.updated',
      metadata: {
        before: { role: member.role, status: member.status },
        after: { role: nextRole, status: input.status ?? member.status },
        propertyIds: propertyIds ?? null,
      },
    });
  });

  return c.json({ data: { id: memberId, role: nextRole } });
});
