import { withAudit, type PrismaClient, type ContractStatus } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { ContractRepository } from './contract.repository';

export interface CreateContractInput {
  vendorId: string;
  reference: string;
  startDate: Date;
  endDate?: Date;
  status?: ContractStatus;
  notes?: string;
}

export class ContractService {
  private readonly repo: ContractRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new ContractRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
  create(input: CreateContractInput) {
    return withAudit(
      this.prisma,
      { entityType: 'Contract', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) => tx.contract.create({ data: input }),
      (c) => ({ entityId: c.id, changes: c })
    );
  }
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'Contract', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.contract.update({ where: { id }, data: { isActive: false } }),
      (c) => ({ entityId: c.id, changes: { isActive: false } })
    );
  }
}
