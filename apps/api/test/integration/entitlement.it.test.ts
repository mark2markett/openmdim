import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';
import { VendorService } from '../../src/catalog/vendor.service';
import { DataProductService } from '../../src/catalog/data-product.service';
import { AddOnService } from '../../src/catalog/add-on.service';
import { ContractService } from '../../src/commercial/contract.service';
import { SubscriptionService } from '../../src/commercial/subscription.service';
import { CostCenterService } from '../../src/org/cost-center.service';
import { ConsumerService } from '../../src/org/consumer.service';
import { AssignmentService } from '../../src/entitlement/assignment.service';

const fee = (amount: number) => ({ amount, currency: 'USD', fxRate: 1, fxAsOf: new Date('2026-06-01') });

describe('Entitlement context', () => {
  let db: TestDb;
  let vendors: VendorService;
  let products: DataProductService;
  let addOns: AddOnService;
  let contracts: ContractService;
  let subs: SubscriptionService;
  let costCenters: CostCenterService;
  let consumers: ConsumerService;
  let assignments: AssignmentService;

  beforeAll(async () => {
    db = await startTestDb();
    vendors = new VendorService(db.prisma);
    products = new DataProductService(db.prisma);
    addOns = new AddOnService(db.prisma);
    contracts = new ContractService(db.prisma);
    subs = new SubscriptionService(db.prisma);
    costCenters = new CostCenterService(db.prisma);
    consumers = new ConsumerService(db.prisma);
    assignments = new AssignmentService(db.prisma);
  });
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  async function seed() {
    const v = await vendors.create({ name: 'BBG', code: 'BBG' });
    const product = await products.create({ vendorId: v.id, name: 'Terminal', code: 'TERM' });
    const c = await contracts.create({ vendorId: v.id, reference: 'C-1', startDate: new Date('2026-01-01') });
    const sub = await subs.create({
      contractId: c.id,
      dataProductId: product.id,
      baseFee: fee(100),
      billingPeriod: 'MONTHLY'
    });
    const addOn = await addOns.create({
      dataProductId: product.id,
      kind: 'FEED',
      name: 'FX',
      code: 'FX',
      billingPeriod: 'MONTHLY',
      fee: fee(10)
    });
    const cc = await costCenters.create({ code: 'CC', name: 'Desk' });
    const consumer = await consumers.create({ type: 'USER', name: 'trader', costCenterId: cc.id });
    return { v, product, sub, addOn, consumer };
  }

  it('assigns a consumer to a subscription with an add-on (+ audit)', async () => {
    const { sub, addOn, consumer } = await seed();
    const a = await assignments.assign({
      consumerId: consumer.id,
      subscriptionId: sub.id,
      startsOn: new Date('2026-06-01'),
      addOnIds: [addOn.id]
    });
    expect(a.isActive).toBe(true);
    expect(await db.prisma.assignmentAddOn.count({ where: { assignmentId: a.id } })).toBe(1);
    expect(await db.prisma.auditEvent.count({ where: { entityType: 'Assignment', action: 'CREATE' } })).toBe(1);
    // every write audited: the add-on link gets its own AuditEvent (WU-1.4)
    expect(
      await db.prisma.auditEvent.count({ where: { entityType: 'AssignmentAddOn', action: 'CREATE' } })
    ).toBe(1);
  });

  it('de-dups add-on ids (active uniqueness of assignment+add-on)', async () => {
    const { sub, addOn, consumer } = await seed();
    const a = await assignments.assign({
      consumerId: consumer.id,
      subscriptionId: sub.id,
      startsOn: new Date('2026-06-01'),
      addOnIds: [addOn.id, addOn.id, addOn.id]
    });
    expect(await db.prisma.assignmentAddOn.count({ where: { assignmentId: a.id } })).toBe(1);
  });

  it('(a) rejects endsOn before startsOn', async () => {
    const { sub, consumer } = await seed();
    await expect(
      assignments.assign({
        consumerId: consumer.id,
        subscriptionId: sub.id,
        startsOn: new Date('2026-06-10'),
        endsOn: new Date('2026-06-01')
      })
    ).rejects.toThrow(/endsOn/);
  });

  it('(b) rejects assigning to a subscription whose data product is inactive', async () => {
    const { sub, product, consumer } = await seed();
    await products.deactivate(product.id);
    await expect(
      assignments.assign({ consumerId: consumer.id, subscriptionId: sub.id, startsOn: new Date('2026-06-01') })
    ).rejects.toThrow(/inactive/);
  });

  it('(c) rejects an add-on from a different data product', async () => {
    const { v, sub, consumer } = await seed();
    const otherProduct = await products.create({ vendorId: v.id, name: 'Other', code: 'OTH' });
    const foreignAddOn = await addOns.create({
      dataProductId: otherProduct.id,
      kind: 'OPTION',
      name: 'Bad',
      code: 'BAD',
      billingPeriod: 'MONTHLY',
      fee: fee(5)
    });
    await expect(
      assignments.assign({
        consumerId: consumer.id,
        subscriptionId: sub.id,
        startsOn: new Date('2026-06-01'),
        addOnIds: [foreignAddOn.id]
      })
    ).rejects.toThrow(/does not belong/);
    expect(await db.prisma.assignment.count()).toBe(0);
  });

  it('(d) rejects a duplicate active assignment for the same (consumer, subscription)', async () => {
    const { sub, consumer } = await seed();
    await assignments.assign({ consumerId: consumer.id, subscriptionId: sub.id, startsOn: new Date('2026-06-01') });
    await expect(
      assignments.assign({ consumerId: consumer.id, subscriptionId: sub.id, startsOn: new Date('2026-06-02') })
    ).rejects.toThrow(/already has an active assignment/);
    expect(await db.prisma.assignment.count({ where: { isActive: true } })).toBe(1);
  });
});
