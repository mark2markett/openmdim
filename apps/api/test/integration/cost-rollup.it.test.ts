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
import { CostRollupService } from '../../src/costing/cost-rollup.service';

describe('Cost rollup (WU-1.6)', () => {
  let db: TestDb;
  let svc: CostRollupService;
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
    svc = new CostRollupService(db.prisma);
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

  it('computes per-consumer / per-cost-center cost and provisioning with mixed periods/currencies', async () => {
    const asOf = new Date('2026-06-01');
    const v = await vendors.create({ name: 'BBG', code: 'BBG' });
    const product = await products.create({ vendorId: v.id, name: 'Terminal', code: 'TERM' });
    const c = await contracts.create({ vendorId: v.id, reference: 'C-1', startDate: new Date('2026-01-01') });
    // base: ANNUAL 1200 EUR @ fx 1.1  ->  (1200*1.1)/12 = 110 USD/month
    const sub = await subs.create({
      contractId: c.id,
      dataProductId: product.id,
      baseFee: { amount: 1200, currency: 'EUR', fxRate: 1.1, fxAsOf: asOf },
      billingPeriod: 'ANNUAL',
      contractedSeats: 2
    });
    // add-on: MONTHLY 10 USD -> 10 USD/month
    const addOn = await addOns.create({
      dataProductId: product.id,
      kind: 'FEED',
      name: 'FX',
      code: 'FX',
      billingPeriod: 'MONTHLY',
      fee: { amount: 10, currency: 'USD', fxRate: 1, fxAsOf: asOf }
    });
    const cc = await costCenters.create({ code: 'CC', name: 'Desk' });
    const consumer = await consumers.create({ type: 'USER', name: 'trader', costCenterId: cc.id });
    await assignments.assign({
      consumerId: consumer.id,
      subscriptionId: sub.id,
      startsOn: asOf,
      addOnIds: [addOn.id]
    });

    expect(await svc.perConsumer(consumer.id)).toBeCloseTo(120, 4); // 110 + 10
    expect(await svc.perCostCenter(cc.id)).toBeCloseTo(120, 4);
    expect(await svc.provisioning(sub.id)).toEqual({ contracted: 2, assigned: 1, delta: 1 });
  });
});
