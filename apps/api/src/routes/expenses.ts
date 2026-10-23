import { expenseCategories, expenses, properties } from '@kost/database';
import {
  createExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
} from '@kost/validation';
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertPropertyAccess, requireRole } from '../lib/access';
import { writeAudit } from '../lib/audit';
import { fail, paginated, paginationFrom, parseJson, parseQuery } from '../lib/http';
import type { AppVariables } from '../types';

export const expenseRoutes = new Hono<{ Variables: AppVariables }>();

const expenseListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  propertyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

expenseRoutes.get('/categories', async (c) => {
  const ctx = c.get('ctx');
  const rows = await ctx.db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.organizationId, ctx.organization.id))
    .orderBy(expenseCategories.name);
  return c.json({ data: rows });
});

expenseRoutes.post('/categories', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin']);
  const input = await parseJson(c, createExpenseCategorySchema);
  try {
    const [category] = await ctx.db
      .insert(expenseCategories)
      .values({ organizationId: ctx.organization.id, name: input.name })
      .returning();
    return c.json({ data: category }, 201);
  } catch {
    fail(409, 'CATEGORY_EXISTS', 'Kategori pengeluaran sudah ada.');
  }
});

expenseRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const query = parseQuery(c, expenseListQuery);
  const page = paginationFrom(query);
  const conditions = [eq(expenses.organizationId, ctx.organization.id)];

  if (query.propertyId) {
    assertPropertyAccess(ctx, query.propertyId);
    conditions.push(eq(expenses.propertyId, query.propertyId));
  }
  if (query.categoryId) conditions.push(eq(expenses.categoryId, query.categoryId));
  if (query.from) conditions.push(gte(expenses.expenseDate, query.from));
  if (query.to) conditions.push(lte(expenses.expenseDate, query.to));
  if (ctx.accessiblePropertyIds !== null) {
    if (ctx.accessiblePropertyIds.length === 0) {
      return c.json(paginated([], 0, page.page, page.pageSize));
    }
    conditions.push(inArray(expenses.propertyId, ctx.accessiblePropertyIds));
  }

  const rows = await ctx.db
    .select({
      id: expenses.id,
      propertyId: expenses.propertyId,
      propertyName: properties.name,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      description: expenses.description,
      recordedBy: expenses.recordedBy,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .innerJoin(properties, eq(properties.id, expenses.propertyId))
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
    .limit(page.limit)
    .offset(page.offset);

  const [totalRow] = await ctx.db
    .select({ total: count() })
    .from(expenses)
    .where(and(...conditions));

  const [sumRow] = await ctx.db
    .select({ amount: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(...conditions));

  return c.json({
    ...paginated(rows, Number(totalRow?.total ?? 0), page.page, page.pageSize),
    summary: { totalAmount: sumRow?.amount ?? '0.00' },
  });
});

expenseRoutes.post('/', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const input = await parseJson(c, createExpenseSchema);
  assertPropertyAccess(ctx, input.propertyId);

  const [property] = await ctx.db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(eq(properties.id, input.propertyId), eq(properties.organizationId, ctx.organization.id)),
    )
    .limit(1);
  if (!property) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');

  const [category] = await ctx.db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.id, input.categoryId),
        eq(expenseCategories.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  if (!category) fail(404, 'CATEGORY_NOT_FOUND', 'Kategori pengeluaran tidak ditemukan.');

  const [expense] = await ctx.db
    .insert(expenses)
    .values({
      organizationId: ctx.organization.id,
      propertyId: input.propertyId,
      categoryId: input.categoryId,
      amount: input.amount,
      expenseDate: input.expenseDate,
      description: input.description,
      recordedBy: ctx.user.id,
    })
    .returning();

  if (!expense) throw new Error('Expense insert failed');

  await writeAudit(ctx.db, ctx, {
    entityType: 'expense',
    entityId: expense.id,
    action: 'expense.created',
    metadata: {
      propertyId: expense.propertyId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
    },
  });

  return c.json({ data: expense }, 201);
});

expenseRoutes.patch('/:expenseId', async (c) => {
  const ctx = c.get('ctx');
  requireRole(ctx, ['owner', 'admin', 'manager']);
  const expenseId = c.req.param('expenseId');
  const input = await parseJson(c, updateExpenseSchema);

  const [existing] = await ctx.db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.organizationId, ctx.organization.id)))
    .limit(1);
  if (!existing) fail(404, 'EXPENSE_NOT_FOUND', 'Pengeluaran tidak ditemukan.');
  assertPropertyAccess(ctx, existing.propertyId);

  if (input.propertyId) {
    assertPropertyAccess(ctx, input.propertyId);
    const [property] = await ctx.db
      .select({ id: properties.id })
      .from(properties)
      .where(
        and(
          eq(properties.id, input.propertyId),
          eq(properties.organizationId, ctx.organization.id),
        ),
      )
      .limit(1);
    if (!property) fail(404, 'PROPERTY_NOT_FOUND', 'Properti tidak ditemukan.');
  }

  if (input.categoryId) {
    const [category] = await ctx.db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.id, input.categoryId),
          eq(expenseCategories.organizationId, ctx.organization.id),
        ),
      )
      .limit(1);
    if (!category) fail(404, 'CATEGORY_NOT_FOUND', 'Kategori pengeluaran tidak ditemukan.');
  }

  const [updated] = await ctx.db
    .update(expenses)
    .set({
      propertyId: input.propertyId ?? existing.propertyId,
      categoryId: input.categoryId ?? existing.categoryId,
      amount: input.amount ?? existing.amount,
      expenseDate: input.expenseDate ?? existing.expenseDate,
      description: input.description ?? existing.description,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, expenseId))
    .returning();

  await writeAudit(ctx.db, ctx, {
    entityType: 'expense',
    entityId: expenseId,
    action: 'expense.updated',
    metadata: {
      before: {
        amount: existing.amount,
        expenseDate: existing.expenseDate,
        description: existing.description,
      },
      after: {
        amount: updated?.amount,
        expenseDate: updated?.expenseDate,
        description: updated?.description,
      },
    },
  });

  return c.json({ data: updated });
});
