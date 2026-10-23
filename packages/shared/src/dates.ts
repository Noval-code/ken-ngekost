export type IsoDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return formatUtcDate(parseParts(value)) === value;
}

function parseParts(value: IsoDate): Date {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatUtcDate(date: Date): IsoDate {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(now = new Date()): IsoDate {
  return formatUtcDate(now);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = parseParts(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, daysInMonth(year, monthIndex));
}

/**
 * Add calendar months while preserving the original anchor day.
 * Jan 31 + 1 month = Feb 28/29; + 2 months = Mar 31, never a permanently shifted anchor.
 */
export function addMonthsAnchored(value: IsoDate, months: number, anchorDay?: number): IsoDate {
  const date = parseParts(value);
  const anchor = anchorDay ?? date.getUTCDate();
  const targetMonthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const year = targetMonthStart.getUTCFullYear();
  const monthIndex = targetMonthStart.getUTCMonth();
  const day = clampDay(year, monthIndex, anchor);
  return formatUtcDate(new Date(Date.UTC(year, monthIndex, day)));
}

export interface BillingPeriod {
  index: number;
  start: IsoDate;
  end: IsoDate;
  dueDate: IsoDate;
  issueDate: IsoDate;
}

export function periodAt(leaseStart: IsoDate, anchorDay: number, index: number): BillingPeriod {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Period index must be a non-negative integer');
  }
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new Error('anchorDay must be between 1 and 31');
  }
  const start = addMonthsAnchored(leaseStart, index, anchorDay);
  const nextStart = addMonthsAnchored(leaseStart, index + 1, anchorDay);
  return {
    index,
    start,
    end: addDays(nextStart, -1),
    dueDate: start,
    issueDate: index === 0 ? start : addDays(start, -3),
  };
}

/**
 * Contract end dates are inclusive. Only full periods fully covered by the
 * contract are billable; the MVP deliberately does not prorate a final period.
 */
export function isPeriodBillable(
  leaseStart: IsoDate,
  anchorDay: number,
  index: number,
  leaseEnd: IsoDate,
): boolean {
  const period = periodAt(leaseStart, anchorDay, index);
  return period.end <= leaseEnd;
}

export function billablePeriods(
  leaseStart: IsoDate,
  anchorDay: number,
  leaseEnd: IsoDate,
  maxPeriods = 240,
): BillingPeriod[] {
  const periods: BillingPeriod[] = [];
  for (let index = 0; index < maxPeriods; index += 1) {
    if (!isPeriodBillable(leaseStart, anchorDay, index, leaseEnd)) break;
    periods.push(periodAt(leaseStart, anchorDay, index));
  }
  return periods;
}

export function firstBillablePeriodEnd(leaseStart: IsoDate, anchorDay: number): IsoDate {
  return periodAt(leaseStart, anchorDay, 0).end;
}

export function formatIndonesianDate(value: IsoDate | string): string {
  const date = value.length === 10 ? parseParts(value) : new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatIndonesianDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function monthRange(month: string): { start: IsoDate; end: IsoDate } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must use YYYY-MM');
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  if (monthNumber < 1 || monthNumber > 12) throw new Error('Invalid month');
  return {
    start: `${month}-01`,
    end: formatUtcDate(new Date(Date.UTC(year, monthNumber, 0))),
  };
}

export function overlaps(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
