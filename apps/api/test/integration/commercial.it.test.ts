import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';
import { VendorService } from '../../src/catalog/vendor.service';
import { DataProductService } from '../../src/catalog/data-product.service';
import { ContractService } from '../../src/commercial/contract.service';
import { SubscriptionService } from '../../src/commercial/subscription.service';

const fee = (amount: number) => ({ amount, currency: 'USD', fxRate: 1, fxAsOf: new Date('2026-06-01') });

describe('Commercial context', () => {
  let db: TestDb;
  let vendors: VendorService;
  let products: DataProductService;
  let contracts: ContractService;
  let subs: SubscriptionService;

  beforeAll(async () => {
    db = await startTestDb();
    vendors = new VendorService(db.prisma);
    products = new DataProductService(db.prisma);
    contracts = new ContractService(db.prisma);
    subs = new SubscriptionService(db.prisma);
  });
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  async function seedSubscription() {
    const v = await vendors.create({ name: 'BBG', code: 'BBG' });
    const p = await products.create({ vendorId: v.id, name: 'Terminal', code: 'TERM' });
    const c = await contracts.create({ vendorId: v.id, reference: 'C-1', startDate: new Date('2026-01-01') });
    const s = await subs.create({
      contractId: c.id,
      dataProductId: p.id,
      baseFee: fee(100),
      billingPeriod: 'MONTHLY',
      contractedSeats: 5
    });
    return { v, p, c, s };
  }

  it('creates a contract (default DRAFT) + audit', async () => {
    const v = await vendors.create({ name: 'V', code: 'V1' });
    const c = await contracts.create({ vendorId: v.id, reference: 'C-9', startDate: new Date('2026-01-01') });
    expect(c.status).toBe('DRAFT');
    expect(await db.prisma.auditEvent.count({ where: { entityType: 'Contract', action: 'CREATE' } })).toBe(1);
  });

  it('creates a subscription with a Money base fee', async () => {
    const { s } = await seedSubscription();
    expect(Number(s.baseFeeAmount)).toBe(100);
    expect(s.contractedSeats).toBe(5);
  });

  it('deactivating a subscription cascades to its active assignments (WU-1.5)', async () => {
    const { s } = await seedSubscription();
    const cc = await db.prisma.costCenter.create({ data: { code: 'CC1', name: 'Desk A' } });
    const consumer = await db.prisma.consumer.create({
      data: { type: 'USER', name: 'trader', costCenterId: cc.id }
    });
    const asg = await db.prisma.assignment.create({
      data: { consumerId: consumer.id, subscriptionId: s.id, startsOn: new Date('2026-06-01') }
    });

    await subs.deactivate(s.id);

    expect((await db.prisma.subscription.findUnique({ where: { id: s.id } }))?.isActive).toBe(false);
    const after = await db.prisma.assignment.findUnique({ where: { id: asg.id } });
    expect(after?.isActive).toBe(false);
    expect(after?.endsOn).not.toBeNull();
    // the cascaded assignment deactivation is itself audited (WU-1.4)
    expect(
      await db.prisma.auditEvent.count({ where: { entityType: 'Assignment', action: 'DEACTIVATE' } })
    ).toBe(1);
  });
});
