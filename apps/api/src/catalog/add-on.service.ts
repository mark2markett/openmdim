import { withAudit, type PrismaClient, type AddOnKind, type BillingPeriod } from '@openmdim/db';
import { Money, type MoneyInput } from '@openmdim/domain';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { AddOnRepository } from './add-on.repository';

export interface CreateAddOnInput {
  dataProductId: string;
  kind: AddOnKind;
  name: string;
  code: string;
  fee: MoneyInput;
  billingPeriod: BillingPeriod;
}

export class AddOnService {
  private readonly repo: AddOnRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new AddOnRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
  async create(input: CreateAddOnInput) {
    const fee = Money.of(input.fee); // validates amount/currency/fxRate (rejects if invalid)
    return withAudit(
      this.prisma,
      { entityType: 'AddOn', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) =>
        tx.addOn.create({
          data: {
            dataProductId: input.dataProductId,
            kind: input.kind,
            name: input.name,
            code: input.code,
            billingPeriod: input.billingPeriod,
            feeAmount: fee.amount,
            feeCurrency: fee.currency,
            feeFxRate: fee.fxRate,
            feeFxAsOf: fee.fxAsOf
          }
        }),
      (a) => ({ entityId: a.id, changes: a })
    );
  }
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'AddOn', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.addOn.update({ where: { id }, data: { isActive: false } }),
      (a) => ({ entityId: a.id, changes: { isActive: false } })
    );
  }
}
