import { withAudit, type PrismaClient } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
import { VendorRepository } from './vendor.repository';

export interface CreateVendorInput {
  name: string;
  code: string;
  description?: string;
  website?: string;
}

export class VendorService {
  private readonly repo: VendorRepository;
  constructor(private readonly prisma: PrismaClient) {
    this.repo = new VendorRepository(prisma);
  }
  findById(id: string) {
    return this.repo.findById(id);
  }
  create(input: CreateVendorInput) {
    return withAudit(
      this.prisma,
      { entityType: 'Vendor', action: 'CREATE', actor: SYSTEM_ACTOR },
      (tx) => tx.vendor.create({ data: input }),
      (v) => ({ entityId: v.id, changes: v })
    );
  }
  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'Vendor', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      (tx) => tx.vendor.update({ where: { id }, data: { isActive: false } }),
      (v) => ({ entityId: v.id, changes: { isActive: false } })
    );
  }
}
