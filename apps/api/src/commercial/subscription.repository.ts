import type { PrismaClient } from '@openmdim/db';

export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }
  countActiveAssignments(subscriptionId: string) {
    return this.prisma.assignment.count({ where: { subscriptionId, isActive: true } });
  }
}
