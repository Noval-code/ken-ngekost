export { formatIdr, formatIndonesianDate, formatIndonesianDateTime } from '@panggora/shared';

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
    occupied: 'Terisi',
    vacant: 'Kosong',
    ended: 'Selesai',
    cancelled: 'Dibatalkan',
    unpaid: 'Belum dibayar',
    partial: 'Sebagian',
    paid: 'Lunas',
    overdue: 'Terlambat',
    void: 'Dibatalkan',
    received: 'Diterima',
    held: 'Ditahan',
    partially_refunded: 'Refund sebagian',
    refunded: 'Direfund',
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Pengelola',
    suspended: 'Ditangguhkan',
    cash: 'Tunai',
    bank_transfer: 'Transfer bank',
  };
  return labels[status] ?? status;
}

export function statusClass(status: string): string {
  if (['active', 'occupied', 'paid', 'received', 'held'].includes(status)) return 'badge-green';
  if (['partial', 'partially_refunded', 'unpaid'].includes(status)) return 'badge-amber';
  if (['overdue', 'suspended', 'cancelled', 'void'].includes(status)) return 'badge-red';
  if (['ended', 'refunded'].includes(status)) return 'badge-blue';
  return 'badge-gray';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
}

export function notificationIcon(type: string): string {
  const icons: Record<string, string> = {
    invoice_issued: 'ReceiptText',
    payment_received: 'Wallet',
    invoice_overdue: 'AlertCircle',
    lease_expiring: 'Clock',
    lease_ended: 'FileX',
    deposit_received: 'Landmark',
    deposit_refunded: 'Landmark',
    system: 'Bell',
  };
  return icons[type] ?? 'Bell';
}

export function notificationColor(type: string): string {
  if (['payment_received', 'deposit_received'].includes(type)) return 'text-accent';
  if (['invoice_overdue', 'lease_expiring'].includes(type)) return 'text-danger';
  if (['invoice_issued'].includes(type)) return 'text-amber';
  if (['lease_ended', 'deposit_refunded'].includes(type)) return 'text-blue';
  return 'text-muted';
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
}
