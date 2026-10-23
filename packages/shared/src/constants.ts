export const ORG_ROLES = ['owner', 'admin', 'manager'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const MEMBER_STATUSES = ['active', 'suspended'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const PROPERTY_STATUSES = ['active', 'inactive'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const ROOM_OPERATIONAL_STATUSES = ['active', 'inactive'] as const;
export type RoomOperationalStatus = (typeof ROOM_OPERATIONAL_STATUSES)[number];

export const LEASE_STATUSES = ['active', 'ended', 'cancelled'] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const INVOICE_STATUSES = ['issued', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['received', 'void'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DEPOSIT_STATUSES = ['held', 'partially_refunded', 'refunded'] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const DERIVED_INVOICE_STATUSES = ['unpaid', 'partial', 'paid', 'overdue', 'void'] as const;
export type DerivedInvoiceStatus = (typeof DERIVED_INVOICE_STATUSES)[number];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Listrik',
  'Air',
  'Internet',
  'Perbaikan',
  'Kebersihan',
  'Gaji',
  'Perlengkapan',
  'Lainnya',
] as const;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;
