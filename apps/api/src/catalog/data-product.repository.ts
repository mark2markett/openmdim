import type { PrismaClient } from '@openmdim/db';

export class DataProductRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.dataProduct.findUnique({ where: { id } });
  }
}
