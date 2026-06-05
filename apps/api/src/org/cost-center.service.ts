import { withAudit, type PrismaClient } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { CostCenterRepository } from './cost-center.repository';

export interface CreateCostCenterInput {
  code: string;
  name: string;
  owner?: string;
}

export class CostCenterService {
  private readonly repo: CostCenterRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new CostCenterRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
  listActive() {
    return this.repo.listActive();
  }
  create(input: CreateCostCenterInput) {
    return withAudit(
      this.prisma,
      { entityType: 'CostCenter', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) => tx.costCenter.create({ data: input }),
      (c) => ({ entityId: c.id, changes: c })
    );
  }
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'CostCenter', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.costCenter.update({ where: { id }, data: { isActive: false } }),
      (c) => ({ entityId: c.id, changes: { isActive: false } })
    );
  }
}
