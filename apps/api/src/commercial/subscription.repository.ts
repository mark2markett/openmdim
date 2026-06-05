import type { PrismaClient } from '@openmdim/db';

export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }
}
