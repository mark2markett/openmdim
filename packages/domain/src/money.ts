// Money value object (CLAUDE.md §6: money is never a bare number). Persisted as a
// 4-column embedding per monetary field; see SYSTEM-DESIGN §4. `normalizeMonthly`
// converts a fee to a monthly amount in the configured base currency (SYSTEM-DESIGN §6).

export type BillingPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

// Base currency for cross-currency rollups. Constant in v1.0; the app layer can
// thread a configured currency through normalizeMonthly's optional arg later.
export const BASE_CURRENCY = 'USD';

export interface MoneyInput {
  amount: number;
  currency: string;
  fxRate: number;
  fxAsOf: Date;
}

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
    readonly fxRate: number,
    readonly fxAsOf: Date
  ) {}

  static of(input: MoneyInput): Money {
    if (!(input.amount >= 0)) throw new Error(`Money.amount must be >= 0, got ${input.amount}`);
    if (!/^[A-Z]{3}$/.test(input.currency))
      throw new Error(`Money.currency must be ISO-4217 (3 upper-case letters), got "${input.currency}"`);
    if (!(input.fxRate > 0)) throw new Error(`Money.fxRate must be > 0, got ${input.fxRate}`);
    if (!(input.fxAsOf instanceof Date) || Number.isNaN(input.fxAsOf.getTime()))
      throw new Error('Money.fxAsOf must be a valid Date');
    return new Money(input.amount, input.currency, input.fxRate, input.fxAsOf);
  }

  /** Map to the persisted columns for a given field prefix (e.g. 'fee' -> feeAmount, ...). */
  toColumns<P extends string>(prefix: P): Record<string, number | string | Date> {
    return {
      [`${prefix}Amount`]: this.amount,
      [`${prefix}Currency`]: this.currency,
      [`${prefix}FxRate`]: this.fxRate,
      [`${prefix}FxAsOf`]: this.fxAsOf
    };
  }

  /** Rebuild from a persisted row's columns for a given field prefix. */
  static fromColumns(prefix: string, row: Record<string, unknown>): Money {
    return Money.of({
      amount: Number(row[`${prefix}Amount`]),
      currency: String(row[`${prefix}Currency`]),
      fxRate: Number(row[`${prefix}FxRate`]),
      fxAsOf: new Date(row[`${prefix}FxAsOf`] as string | number | Date)
    });
  }

  /** Amount converted to the base currency (per fxRate). */
  toBase(): number {
    return this.amount * this.fxRate;
  }
}

const PERIOD_DIVISOR: Record<BillingPeriod, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 };

/** Monthly amount in BASE_CURRENCY (fxRate 1), normalizing period and currency. */
export function normalizeMonthly(money: Money, period: BillingPeriod): Money {
  const monthlyBase = money.toBase() / PERIOD_DIVISOR[period];
  return Money.of({ amount: monthlyBase, currency: BASE_CURRENCY, fxRate: 1, fxAsOf: money.fxAsOf });
}
