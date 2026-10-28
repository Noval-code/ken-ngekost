import {
  addDays,
  addMonthsAnchored,
  billablePeriods,
  compareMoney,
  isIsoDate,
  isPeriodBillable,
  periodAt,
  toMoneyString,
} from '@panggora/shared';
import { describe, expect, it } from 'vitest';

describe('date helpers', () => {
  it('preserves month-end anchors across February', () => {
    expect(addMonthsAnchored('2026-01-31', 1, 31)).toBe('2026-02-28');
    expect(addMonthsAnchored('2026-01-31', 2, 31)).toBe('2026-03-31');
    expect(addMonthsAnchored('2024-01-31', 1, 31)).toBe('2024-02-29');
  });

  it('builds inclusive billing periods', () => {
    const period = periodAt('2026-01-31', 31, 1);
    expect(period.start).toBe('2026-02-28');
    expect(period.end).toBe('2026-03-30');
    expect(period.dueDate).toBe('2026-02-28');
    expect(period.issueDate).toBe('2026-02-25');
  });

  it('only bills full periods covered by the contract', () => {
    expect(isPeriodBillable('2026-01-01', 1, 0, '2026-01-31')).toBe(true);
    expect(isPeriodBillable('2026-01-01', 1, 1, '2026-02-15')).toBe(false);
    expect(billablePeriods('2026-01-01', 1, '2026-02-28')).toHaveLength(2);
  });

  it('validates and advances ISO dates', () => {
    expect(isIsoDate('2026-10-23')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('money helpers', () => {
  it('uses decimal arithmetic instead of floating point', () => {
    expect(toMoneyString('0.1')).toBe('0.10');
    expect(compareMoney('1500000.00', '1500000')).toBe(0);
    expect(compareMoney('0.30', '0.1')).toBe(1);
  });
});
