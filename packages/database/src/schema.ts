import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
};

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    status: text('status').default('active').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    check('users_status_ck', sql`${table.status} in ('active', 'suspended')`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sessions_token_uq').on(table.token),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('accounts_user_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...timestamps,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (table) => [index('organizations_owner_idx').on(table.ownerUserId)],
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    status: text('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organization_members_org_user_uq').on(table.organizationId, table.userId),
    index('organization_members_user_idx').on(table.userId),
    check('organization_members_role_ck', sql`${table.role} in ('owner', 'admin', 'manager')`),
    check('organization_members_status_ck', sql`${table.status} in ('active', 'suspended')`),
  ],
);

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    address: text('address').notNull(),
    description: text('description'),
    status: text('status').default('active').notNull(),
    ...timestamps,
  },
  (table) => [
    index('properties_org_idx').on(table.organizationId),
    check('properties_status_ck', sql`${table.status} in ('active', 'inactive')`),
  ],
);

export const propertyAssignments = pgTable(
  'property_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    organizationMemberId: uuid('organization_member_id')
      .notNull()
      .references(() => organizationMembers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('property_assignments_property_member_uq').on(
      table.propertyId,
      table.organizationMemberId,
    ),
    index('property_assignments_member_idx').on(table.organizationMemberId),
  ],
);

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'restrict' }),
    roomNumber: text('room_number').notNull(),
    baseRent: numeric('base_rent', { precision: 14, scale: 2 }).notNull(),
    operationalStatus: text('operational_status').default('active').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('rooms_property_number_uq').on(table.propertyId, table.roomNumber),
    index('rooms_org_idx').on(table.organizationId),
    index('rooms_property_idx').on(table.propertyId),
    check('rooms_base_rent_ck', sql`${table.baseRent} >= 0`),
    check('rooms_operational_status_ck', sql`${table.operationalStatus} in ('active', 'inactive')`),
  ],
);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [index('tenants_org_idx').on(table.organizationId)],
);

export const leases = pgTable(
  'leases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'restrict' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    rentAmount: numeric('rent_amount', { precision: 14, scale: 2 }).notNull(),
    billingAnchorDay: integer('billing_anchor_day').notNull(),
    depositAmount: numeric('deposit_amount', { precision: 14, scale: 2 }).default('0').notNull(),
    status: text('status').default('active').notNull(),
    notes: text('notes'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('leases_org_idx').on(table.organizationId),
    index('leases_room_idx').on(table.roomId),
    index('leases_tenant_idx').on(table.tenantId),
    uniqueIndex('leases_one_active_per_room_uq')
      .on(table.roomId)
      .where(sql`${table.status} = 'active'`),
    check('leases_date_ck', sql`${table.endDate} >= ${table.startDate}`),
    check('leases_rent_ck', sql`${table.rentAmount} > 0`),
    check('leases_deposit_ck', sql`${table.depositAmount} >= 0`),
    check('leases_anchor_ck', sql`${table.billingAnchorDay} between 1 and 31`),
    check('leases_status_ck', sql`${table.status} in ('active', 'ended', 'cancelled')`),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    leaseId: uuid('lease_id')
      .notNull()
      .references(() => leases.id, { onDelete: 'restrict' }),
    invoiceNumber: text('invoice_number').notNull(),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    status: text('status').default('issued').notNull(),
    voidReason: text('void_reason'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('invoices_org_number_uq').on(table.organizationId, table.invoiceNumber),
    uniqueIndex('invoices_lease_period_uq').on(table.leaseId, table.periodStart),
    index('invoices_org_due_idx').on(table.organizationId, table.dueDate),
    index('invoices_lease_idx').on(table.leaseId),
    check('invoices_total_ck', sql`${table.totalAmount} >= 0 and ${table.subtotal} >= 0`),
    check('invoices_status_ck', sql`${table.status} in ('issued', 'void')`),
    check('invoices_period_ck', sql`${table.periodEnd} >= ${table.periodStart}`),
  ],
);

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('invoice_items_invoice_idx').on(table.invoiceId)],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    paymentNumber: text('payment_number').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    method: text('method').notNull(),
    paidAt: date('paid_at', { mode: 'string' }).notNull(),
    reference: text('reference'),
    notes: text('notes'),
    status: text('status').default('received').notNull(),
    recordedBy: text('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotency_key'),
    voidReason: text('void_reason'),
    voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('payments_org_number_uq').on(table.organizationId, table.paymentNumber),
    uniqueIndex('payments_org_idempotency_uq')
      .on(table.organizationId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    index('payments_org_paid_idx').on(table.organizationId, table.paidAt),
    check('payments_amount_ck', sql`${table.amount} > 0`),
    check('payments_method_ck', sql`${table.method} in ('cash', 'bank_transfer')`),
    check('payments_status_ck', sql`${table.status} in ('received', 'void')`),
  ],
);

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payment_allocations_payment_invoice_uq').on(table.paymentId, table.invoiceId),
    index('payment_allocations_payment_idx').on(table.paymentId),
    index('payment_allocations_invoice_idx').on(table.invoiceId),
    check('payment_allocations_amount_ck', sql`${table.amount} > 0`),
  ],
);

export const deposits = pgTable(
  'deposits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    leaseId: uuid('lease_id')
      .notNull()
      .references(() => leases.id, { onDelete: 'restrict' }),
    amountReceived: numeric('amount_received', { precision: 14, scale: 2 }).notNull(),
    amountRefunded: numeric('amount_refunded', { precision: 14, scale: 2 }).default('0').notNull(),
    status: text('status').default('held').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('deposits_lease_uq').on(table.leaseId),
    index('deposits_org_idx').on(table.organizationId),
    check(
      'deposits_amount_ck',
      sql`${table.amountReceived} >= 0 and ${table.amountRefunded} >= 0 and ${table.amountRefunded} <= ${table.amountReceived}`,
    ),
    check('deposits_status_ck', sql`${table.status} in ('held', 'partially_refunded', 'refunded')`),
  ],
);

export const depositTransactions = pgTable(
  'deposit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    depositId: uuid('deposit_id')
      .notNull()
      .references(() => deposits.id, { onDelete: 'restrict' }),
    type: text('type').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    notes: text('notes'),
    recordedBy: text('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('deposit_transactions_deposit_idx').on(table.depositId),
    check('deposit_transactions_type_ck', sql`${table.type} in ('received', 'refunded')`),
    check('deposit_transactions_amount_ck', sql`${table.amount} > 0`),
  ],
);

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('expense_categories_org_name_uq').on(table.organizationId, table.name)],
);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => expenseCategories.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    expenseDate: date('expense_date', { mode: 'string' }).notNull(),
    description: text('description').notNull(),
    recordedBy: text('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (table) => [
    index('expenses_org_date_idx').on(table.organizationId, table.expenseDate),
    index('expenses_property_idx').on(table.propertyId),
    check('expenses_amount_ck', sql`${table.amount} > 0`),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_org_created_idx').on(table.organizationId, table.createdAt),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  ],
);

export const scheduledJobRuns = pgTable(
  'scheduled_job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobName: text('job_name').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
    summary: jsonb('summary').$type<Record<string, unknown>>().default({}).notNull(),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('scheduled_job_runs_name_started_idx').on(table.jobName, table.startedAt),
    check('scheduled_job_runs_status_ck', sql`${table.status} in ('running', 'success', 'failed')`),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    linkUrl: text('link_url'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_read_idx').on(table.userId, table.readAt),
    index('notifications_org_user_created_idx').on(table.organizationId, table.userId, table.createdAt),
    check(
      'notifications_type_ck',
      sql`${table.type} in ('invoice_issued', 'payment_received', 'invoice_overdue', 'lease_expiring', 'lease_ended', 'deposit_received', 'deposit_refunded', 'system')`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
