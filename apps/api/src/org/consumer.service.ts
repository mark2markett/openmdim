import { withAudit, type PrismaClient, type ConsumerType } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { ConsumerRepository } from './consumer.repository';

export interface CreateConsumerInput {
  type: ConsumerType;
  name: string;
  externalRef?: string;
  costCenterId: string;
}

export class ConsumerService {
  private readonly repo: ConsumerRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new ConsumerRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }

  /** Each consumer must align to an existing, active cost center (SYSTEM-DESIGN §4). */
  create(input: CreateConsumerInput) {
    return withAudit(
      this.prisma,
      { entityType: 'Consumer', action: 'CREATE', actor: SYSTEM_ACTOR },
      async (tx) => {
        const cc = await tx.costCenter.findUnique({ where: { id: input.costCenterId } });
        if (!cc || !cc.isActive) {
          throw new Error(`CostCenter ${input.costCenterId} not found or inactive`);
        }
        return tx.consumer.create({ data: input });
      },
      (c) => ({ entityId: c.id, changes: c })
    );
  }

  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'Consumer', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.consumer.update({ where: { id }, data: { isActive: false } }),
      (c) => ({ entityId: c.id, changes: { isActive: false } })
    );
  }
}
