import type { PrismaClient } from '@openmdim/db';

export class VendorRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.vendor.findUnique({ where: { id } });
  }
}
