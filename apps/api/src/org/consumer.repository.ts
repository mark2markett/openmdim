import type { PrismaClient } from '@openmdim/db';

export class ConsumerRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.consumer.findUnique({ where: { id } });
  }
}
