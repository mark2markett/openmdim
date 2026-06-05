import type { PrismaClient } from '@openmdim/db';

export class CostCenterRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.costCenter.findUnique({ where: { id } });
  }
}
