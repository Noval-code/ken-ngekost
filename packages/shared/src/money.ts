import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal;

export function money(value: MoneyInput): Decimal {
  return new Decimal(value);
}

export function toMoneyString(value: MoneyInput): string {
  return money(value).toFixed(2);
}

export function addMoney(...values: MoneyInput[]): string {
  return values.reduce((total: Decimal, value) => total.plus(value), new Decimal(0)).toFixed(2);
}

export function subtractMoney(a: MoneyInput, b: MoneyInput): string {
  return new Decimal(a).minus(b).toFixed(2);
}

export function multiplyMoney(a: MoneyInput, b: MoneyInput): string {
  return new Decimal(a).times(b).toFixed(2);
}

export function compareMoney(a: MoneyInput, b: MoneyInput): number {
  return new Decimal(a).comparedTo(b);
}

export function isPositiveMoney(value: MoneyInput): boolean {
  return new Decimal(value).greaterThan(0);
}

export function isZeroMoney(value: MoneyInput): boolean {
  return new Decimal(value).isZero();
}

export function formatIdr(value: MoneyInput, options?: { compact?: boolean }): string {
  const number = Number(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: options?.compact ? 'compact' : 'standard',
  }).format(number);
}
