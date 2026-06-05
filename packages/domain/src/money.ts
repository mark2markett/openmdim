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

/** Active ISO-4217 alphabetic currency codes. */
const ISO_4217 = new Set<string>([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN',
  'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF',
  'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB',
  'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG',
  'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF',
  'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA',
  'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO',
  'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD',
  'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN',
  'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX',
  'USD', 'UYU', 'UZS', 'VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR',
  'ZMW', 'ZWL'
]);

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
    readonly fxRate: number,
    readonly fxAsOf: Date
  ) {}

  static of(input: MoneyInput): Money {
    if (!(input.amount >= 0)) throw new Error(`Money.amount must be >= 0, got ${input.amount}`);
    if (!ISO_4217.has(input.currency))
      throw new Error(`Money.currency must be a valid ISO-4217 code, got "${input.currency}"`);
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
