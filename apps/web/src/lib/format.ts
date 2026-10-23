export { formatIdr, formatIndonesianDate, formatIndonesianDateTime } from '@kost/shared';

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
