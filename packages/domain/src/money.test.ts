import { describe, it, expect } from 'vitest';
import { Money, normalizeMonthly } from './money';

describe('Money', () => {
  it('constructs and validates', () => {
    const m = Money.of({ amount: 100, currency: 'USD', fxRate: 1, fxAsOf: new Date('2026-06-01') });
    expect(m.amount).toBe(100);
    expect(m.currency).toBe('USD');
  });
  it('rejects negative amount', () => {
    expect(() => Money.of({ amount: -1, currency: 'USD', fxRate: 1, fxAsOf: new Date() })).toThrow();
  });
  it('rejects bad currency', () => {
    expect(() => Money.of({ amount: 1, currency: 'US', fxRate: 1, fxAsOf: new Date() })).toThrow();
  });
  it('rejects a well-formed but non-ISO-4217 code', () => {
    expect(() => Money.of({ amount: 1, currency: 'ZZZ', fxRate: 1, fxAsOf: new Date() })).toThrow();
  });
  it('rejects fxRate <= 0', () => {
    expect(() => Money.of({ amount: 1, currency: 'EUR', fxRate: 0, fxAsOf: new Date() })).toThrow();
  });
  it('round-trips to/from columns', () => {
    const d = new Date('2026-06-01T00:00:00Z');
    const cols = Money.of({ amount: 12.5, currency: 'EUR', fxRate: 1.08, fxAsOf: d }).toColumns('fee');
    expect(cols).toEqual({ feeAmount: 12.5, feeCurrency: 'EUR', feeFxRate: 1.08, feeFxAsOf: d });
    const back = Money.fromColumns('fee', cols);
    expect(back.amount).toBe(12.5);
    expect(back.currency).toBe('EUR');
  });
  it('normalizes annual EUR to monthly base currency', () => {
    const annual = Money.of({ amount: 1200, currency: 'EUR', fxRate: 1.1, fxAsOf: new Date() });
    const monthly = normalizeMonthly(annual, 'ANNUAL'); // 1200/12 * 1.1 = 110
    expect(monthly.amount).toBeCloseTo(110, 6);
    expect(monthly.currency).toBe('USD');
  });
  it('normalizes quarterly correctly', () => {
    const q = Money.of({ amount: 300, currency: 'USD', fxRate: 1, fxAsOf: new Date() });
    expect(normalizeMonthly(q, 'QUARTERLY').amount).toBeCloseTo(100, 6);
  });
});
