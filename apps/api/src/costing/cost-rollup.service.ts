import type { PrismaClient } from '@openmdim/db';
import { Money, normalizeMonthly, type BillingPeriod } from '@openmdim/domain';

export interface Provisioning {
  contracted: number;
  assigned: number;
  /** contracted - assigned: positive = under-provisioned (empty seats), negative = over. */
  delta: number;
}

/**
 * Cross-context READ MODEL (reporting concern): computes monthly spend in the base
 * currency. Per SYSTEM-DESIGN §6 each fee is normalized to a monthly base-currency
 * basis before summing. It reads via Prisma directly (no context repository imports),
 * so it does not cross the per-context repository boundary.
 */
export class CostRollupService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Monthly base-currency cost of one consumer's active assignments (+ active add-ons). */
  async perConsumer(consumerId: string): Promise<number> {
    const assignments = await this.prisma.assignment.findMany({
      where: { consumerId, isActive: true },
      include: {
        subscription: true,
        // only active add-on links whose underlying AddOn is also still active
        addOns: { where: { isActive: true, addOn: { isActive: true } }, include: { addOn: true } }
      }
    });

    let total = 0;
    for (const a of assignments) {
      const sub = a.subscription;
      const base = Money.fromColumns('baseFee', sub as unknown as Record<string, unknown>);
      total += normalizeMonthly(base, sub.billingPeriod as BillingPeriod).amount;

      for (const link of a.addOns) {
        const fee = Money.fromColumns('fee', link.addOn as unknown as Record<string, unknown>);
        total += normalizeMonthly(fee, link.addOn.billingPeriod as BillingPeriod).amount;
      }
    }
    return total;
  }

  /** Monthly base-currency spend rolled up across a cost center's active consumers. */
  async perCostCenter(costCenterId: string): Promise<number> {
    const consumers = await this.prisma.consumer.findMany({
      where: { costCenterId, isActive: true }
    });
    let total = 0;
    for (const c of consumers) {
      total += await this.perConsumer(c.id);
    }
    return total;
  }

  /** Contracted seats vs active assignments for a subscription. */
  async provisioning(subscriptionId: string): Promise<Provisioning> {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    const contracted = sub?.contractedSeats ?? 0;
    const assigned = await this.prisma.assignment.count({
      where: { subscriptionId, isActive: true }
    });
    return { contracted, assigned, delta: contracted - assigned };
  }
}
