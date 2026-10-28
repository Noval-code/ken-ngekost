import { z } from 'zod';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ORG_ROLES,
  PAYMENT_METHODS,
  isIsoDate,
} from '@panggora/shared';

const nonEmpty = (max = 255) => z.string().trim().min(1).max(max);
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const isoDate = z.string().refine(isIsoDate, 'Use a valid YYYY-MM-DD date');
export const optionalIsoDate = isoDate.optional();

export const moneyAmount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Use a positive amount with at most 2 decimals')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

export const nonNegativeMoney = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Use a non-negative amount with at most 2 decimals');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional(),
  propertyId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const createMemberSchema = z.object({
  name: nonEmpty(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(ORG_ROLES),
  propertyIds: z.array(z.string().uuid()).default([]),
});

export const updateMemberSchema = z.object({
  role: z.enum(ORG_ROLES).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  propertyIds: z.array(z.string().uuid()).optional(),
});

export const updateOrganizationSchema = z.object({
  name: nonEmpty(160),
  address: optionalText(500),
  phone: optionalText(40),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
});

export const createPropertySchema = z.object({
  name: nonEmpty(120),
  address: nonEmpty(500),
  description: optionalText(2000),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updatePropertySchema = createPropertySchema.partial();

export const createRoomSchema = z.object({
  roomNumber: nonEmpty(30),
  baseRent: nonNegativeMoney,
  operationalStatus: z.enum(['active', 'inactive']).default('active'),
  description: optionalText(1000),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createTenantSchema = z.object({
  name: nonEmpty(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, 'Use a valid phone number'),
  notes: optionalText(2000),
});

export const updateTenantSchema = createTenantSchema.partial();

export const createLeaseSchema = z
  .object({
    roomId: z.string().uuid(),
    tenantId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    rentAmount: moneyAmount,
    depositAmount: nonNegativeMoney.default('0'),
    notes: optionalText(2000),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const endLeaseSchema = z.object({
  endDate: isoDate,
  reason: z.string().trim().min(3).max(500),
});

export const invoiceListQuery = paginationQuery.extend({
  status: z.enum(['all', 'unpaid', 'partial', 'paid', 'overdue', 'void']).default('all'),
  periodStart: isoDate.optional(),
  periodEnd: isoDate.optional(),
  tenantId: z.string().uuid().optional(),
});

export const createPaymentSchema = z.object({
  amount: moneyAmount,
  method: z.enum(PAYMENT_METHODS),
  paidAt: isoDate,
  reference: optionalText(160),
  notes: optionalText(1000),
  idempotencyKey: z.string().trim().min(8).max(100),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().uuid(),
        amount: moneyAmount,
      }),
    )
    .min(1)
    .max(20),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const receiveDepositSchema = z.object({
  leaseId: z.string().uuid(),
  amount: moneyAmount,
  notes: optionalText(1000),
});

export const refundDepositSchema = z.object({
  amount: moneyAmount,
  reason: z.string().trim().min(3).max(500),
});

export const createExpenseSchema = z.object({
  propertyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: moneyAmount,
  expenseDate: isoDate,
  description: nonEmpty(500),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createExpenseCategorySchema = z.object({
  name: nonEmpty(80),
});

export const reportQuery = z.object({
  from: isoDate,
  to: isoDate,
  propertyId: z.string().uuid().optional(),
});

export const dashboardQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  propertyId: z.string().uuid().optional(),
});

export const notificationListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  unreadOnly: z.enum(['true', 'false']).default('false'),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
