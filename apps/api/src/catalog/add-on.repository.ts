import type { PrismaClient } from '@openmdim/db';

export class AddOnRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.addOn.findUnique({ where: { id } });
  }
}
