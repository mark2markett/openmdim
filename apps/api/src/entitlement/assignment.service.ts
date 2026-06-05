import { withAudit, type PrismaClient } from '@openmdim/db';
import { SYSTEM_ACTOR } from '../common/audit.types';
// Cross-context reads go through SERVICE interfaces (not repositories) per WU-1.3/U.4.
import { SubscriptionService } from '../commercial/subscription.service';
import { DataProductService } from '../catalog/data-product.service';
import { AddOnService } from '../catalog/add-on.service';
import { AssignmentRepository } from './assignment.repository';

export interface AssignInput {
  consumerId: string;
  subscriptionId: string;
  startsOn: Date;
  endsOn?: Date;
  addOnIds?: string[];
}

export class AssignmentService {
  private readonly repo: AssignmentRepository;
  private readonly subscriptions: SubscriptionService;
  private readonly products: DataProductService;
  private readonly addOns: AddOnService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new AssignmentRepository(prisma);
    this.subscriptions = new SubscriptionService(prisma);
    this.products = new DataProductService(prisma);
    this.addOns = new AddOnService(prisma);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  /**
   * Assign a consumer to a subscription (+ optional add-ons), enforcing SYSTEM-DESIGN §5.4:
   *  (a) endsOn >= startsOn
   *  (b) the subscription's DataProduct must be active
   *  (c) every add-on must belong to that same DataProduct (and be active)
   *  (d) at most one ACTIVE assignment per (consumer, subscription) — checked in-tx
   */
  async assign(input: AssignInput) {
    const { consumerId, subscriptionId, startsOn, endsOn, addOnIds = [] } = input;

    if (endsOn && endsOn.getTime() < startsOn.getTime()) {
      throw new Error('Assignment.endsOn must be on or after startsOn');
    }

    const sub = await this.subscriptions.findById(subscriptionId);
    if (!sub || !sub.isActive) throw new Error(`Subscription ${subscriptionId} not found or inactive`);

    const product = await this.products.findById(sub.dataProductId);
    if (!product || !product.isActive) {
      throw new Error(`DataProduct ${sub.dataProductId} for this subscription is inactive`);
    }

    for (const addOnId of addOnIds) {
      const addOn = await this.addOns.findById(addOnId);
      if (!addOn || !addOn.isActive) throw new Error(`AddOn ${addOnId} not found or inactive`);
      if (addOn.dataProductId !== sub.dataProductId) {
        throw new Error(`AddOn ${addOnId} does not belong to the subscription's data product`);
      }
    }

    return withAudit(
      this.prisma,
      { entityType: 'Assignment', action: 'CREATE', actor: SYSTEM_ACTOR },
      async (tx) => {
        const dup = await tx.assignment.findFirst({
          where: { consumerId, subscriptionId, isActive: true }
        });
        if (dup) throw new Error('Consumer already has an active assignment to this subscription');

        const assignment = await tx.assignment.create({
          data: { consumerId, subscriptionId, startsOn, endsOn }
        });
        for (const addOnId of addOnIds) {
          await tx.assignmentAddOn.create({ data: { assignmentId: assignment.id, addOnId } });
        }
        return assignment;
      },
      (a) => ({ entityId: a.id, changes: a })
    );
  }

  deactivate(id: string) {
    return withAudit(
      this.prisma,
      { entityType: 'Assignment', action: 'DEACTIVATE', actor: SYSTEM_ACTOR },
      async (tx) => {
        const assignment = await tx.assignment.update({
          where: { id },
          data: { isActive: false, endsOn: new Date() }
        });
        await tx.assignmentAddOn.updateMany({
          where: { assignmentId: id, isActive: true },
          data: { isActive: false }
        });
        return assignment;
      },
      (a) => ({ entityId: a.id, changes: { isActive: false } })
    );
  }
}
