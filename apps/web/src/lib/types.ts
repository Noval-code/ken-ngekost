export interface MembershipSummary {
  id: string;
  role: 'owner' | 'admin' | 'manager';
  status: 'active' | 'suspended';
  organization: { id: string; name: string };
}

export interface Me {
  user: { id: string; name: string; email: string; status: string };
  organization: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  membership: MembershipSummary;
  memberships: MembershipSummary[];
  accessiblePropertyIds: string[] | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface PropertyRow {
  id: string;
  name: string;
  address: string;
  description: string | null;
  status: string;
  roomCount: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
}

export interface RoomRow {
  id: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  baseRent: string;
  operationalStatus: string;
  occupancy: 'occupied' | 'vacant';
  activeLeaseId: string | null;
  activeTenantId: string | null;
  activeTenantName: string | null;
}

export interface TenantRow {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  activeRoom: string | null;
  activeProperty: string | null;
  occupancy: string;
  createdAt: string;
}

export interface LeaseRow {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  roomId: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  derivedStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'void';
  roomNumber: string;
  propertyName: string;
  tenantName: string;
}

export interface PaymentRow {
  id: string;
  paymentNumber: string;
  amount: string;
  method: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  status: string;
  invoiceNumbers: string;
  tenantNames: string;
}

export interface ExpenseRow {
  id: string;
  propertyId: string;
  propertyName: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  expenseDate: string;
  description: string;
  recordedBy: string;
}

export interface DepositRow {
  id: string;
  leaseId: string;
  amountReceived: string;
  amountRefunded: string;
  heldAmount: string;
  status: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
}

export interface ReportProperty {
  propertyId: string;
  propertyName: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  cashReceipts: string;
  invoicesIssued: string;
  invoicesCount: number;
  outstanding: string;
  overdue: string;
  expenses: string;
  netCash: string;
  depositReceived: string;
  depositRefunded: string;
}

export interface Report {
  period: { from: string; to: string };
  totals: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    cashReceipts: string;
    invoicesIssued: string;
    invoicesCount: number;
    outstanding: string;
    overdue: string;
    expenses: string;
    netCash: string;
    depositReceived: string;
    depositRefunded: string;
  };
  properties: ReportProperty[];
}

export interface DashboardData {
  period: { from: string; to: string };
  totals: Report['totals'] & { outstandingAll: string; overdueAll: string };
  properties: ReportProperty[];
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    method: string;
    paidAt: string;
    status: string;
    tenantNames: string;
  }>;
  dueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: string;
    totalAmount: string;
    roomNumber: string;
    propertyName: string;
    tenantName: string;
    balance: string;
  }>;
  definitions: Record<string, string>;
}
