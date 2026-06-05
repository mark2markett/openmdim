import type { PrismaClient } from '@openmdim/db';

export class ContractRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.contract.findUnique({ where: { id } });
  }
}
