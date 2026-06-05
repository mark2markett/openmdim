import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';
import { VendorService } from '../../src/catalog/vendor.service';
import { DataProductService } from '../../src/catalog/data-product.service';
import { AddOnService } from '../../src/catalog/add-on.service';

describe('Catalog context', () => {
  let db: TestDb;
  let vendors: VendorService;
  let products: DataProductService;
  let addOns: AddOnService;

  beforeAll(async () => {
    db = await startTestDb();
    vendors = new VendorService(db.prisma);
    products = new DataProductService(db.prisma);
    addOns = new AddOnService(db.prisma);
  });
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  it('creates a vendor with a CREATE audit', async () => {
    const v = await vendors.create({ name: 'Refinitiv', code: 'RFT' });
    expect(v.isActive).toBe(true);
    expect(await db.prisma.auditEvent.count({ where: { entityType: 'Vendor', action: 'CREATE' } })).toBe(1);
  });

  it('soft-deletes a vendor (never hard delete) with a DEACTIVATE audit', async () => {
    const v = await vendors.create({ name: 'A', code: 'A1' });
    await vendors.deactivate(v.id);
    const row = await db.prisma.vendor.findUnique({ where: { id: v.id } });
    expect(row).not.toBeNull();
    expect(row?.isActive).toBe(false);
    expect(await db.prisma.auditEvent.count({ where: { action: 'DEACTIVATE' } })).toBe(1);
  });

  it('creates a data product and an add-on with a Money fee', async () => {
    const v = await vendors.create({ name: 'Bloomberg', code: 'BBG' });
    const p = await products.create({ vendorId: v.id, name: 'Terminal', code: 'TERM' });
    const a = await addOns.create({
      dataProductId: p.id,
      kind: 'FEED',
      name: 'FX feed',
      code: 'FX',
      billingPeriod: 'MONTHLY',
      fee: { amount: 25, currency: 'USD', fxRate: 1, fxAsOf: new Date('2026-06-01') }
    });
    expect(Number(a.feeAmount)).toBe(25);
    expect(a.feeCurrency).toBe('USD');
    // vendor + product + add-on each emitted one CREATE audit
    expect(await db.prisma.auditEvent.count({ where: { action: 'CREATE' } })).toBe(3);
  });

  it('rejects an invalid Money fee (no write, no audit)', async () => {
    const v = await vendors.create({ name: 'V', code: 'V1' });
    const p = await products.create({ vendorId: v.id, name: 'P', code: 'P1' });
    await expect(
      addOns.create({
        dataProductId: p.id,
        kind: 'OPTION',
        name: 'bad',
        code: 'BAD',
        billingPeriod: 'MONTHLY',
        fee: { amount: -5, currency: 'USD', fxRate: 1, fxAsOf: new Date() }
      })
    ).rejects.toThrow();
    expect(await db.prisma.addOn.count()).toBe(0);
  });
});
