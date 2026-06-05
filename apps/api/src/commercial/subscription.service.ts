import { withAudit, type PrismaClient, type BillingPeriod } from '@openmdim/db';
import { Money, type MoneyInput } from '@openmdim/domain';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { SubscriptionRepository } from './subscription.repository';

export interface CreateSubscriptionInput {
  contractId: string;
  dataProductId: string;
  baseFee: MoneyInput;
  billingPeriod: BillingPeriod;
  contractedSeats?: number;
  startDate?: Date;
  endDate?: Date;
}

export class SubscriptionService {
  private readonly repo: SubscriptionRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SubscriptionRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }

  async create(input: CreateSubscriptionInput) {
    const baseFee = Money.of(input.baseFee); // validates
    return withAudit(
      this.prisma,
      { entityType: 'Subscription', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) =>
        tx.subscription.create({
          data: {
            contractId: input.contractId,
            dataProductId: input.dataProductId,
            billingPeriod: input.billingPeriod,
            contractedSeats: input.contractedSeats,
            startDate: input.startDate,
            endDate: input.endDate,
            baseFeeAmount: baseFee.amount,
            baseFeeCurrency: baseFee.currency,
            baseFeeFxRate: baseFee.fxRate,
            baseFeeFxAsOf: baseFee.fxAsOf
          }
        }),
      (s) => ({ entityId: s.id, changes: s })
    );
  }

  /**
   * Soft-delete cascade (WU-1.5): deactivating a subscription deactivates its active
   * assignments in the SAME transaction (ends them as of now). One AuditEvent records
   * the subscription deactivation.
   */
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'Subscription', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      async (tx) => {
        const sub = await tx.subscription.update({ where: { id }, data: { isActive: false } });
        await tx.assignment.updateMany({
          where: { subscriptionId: id, isActive: true },
          data: { isActive: false, endsOn: new Date() }
        });
        return sub;
      },
      (s) => ({ entityId: s.id, changes: { isActive: false, cascade: 'active assignments deactivated' } })
    );
  }
}
