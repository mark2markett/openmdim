import { withAudit, type PrismaClient } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { DataProductRepository } from './data-product.repository';

export interface CreateDataProductInput {
  vendorId: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
}

export class DataProductService {
  private readonly repo: DataProductRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new DataProductRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
  create(input: CreateDataProductInput) {
    return withAudit(
      this.prisma,
      { entityType: 'DataProduct', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) => tx.dataProduct.create({ data: input }),
      (p) => ({ entityId: p.id, changes: p })
    );
  }
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'DataProduct', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.dataProduct.update({ where: { id }, data: { isActive: false } }),
      (p) => ({ entityId: p.id, changes: { isActive: false } })
    );
  }
}
