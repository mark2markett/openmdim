import type { PrismaClient } from '@openmdim/db';

export class AssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}
  findById(id: string) {
    return this.prisma.assignment.findUnique({ where: { id }, include: { addOns: true } });
  }
}
