import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';
import { CostCenterService } from '../../src/org/cost-center.service';
import { ConsumerService } from '../../src/org/consumer.service';

describe('Org context', () => {
  let db: TestDb;
  let costCenters: CostCenterService;
  let consumers: ConsumerService;

  beforeAll(async () => {
    db = await startTestDb();
    costCenters = new CostCenterService(db.prisma);
    consumers = new ConsumerService(db.prisma);
  });
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  it('creates a cost center with a unique code + audit', async () => {
    const cc = await costCenters.create({ code: 'EQ-DESK', name: 'Equities Desk' });
    expect(cc.code).toBe('EQ-DESK');
    expect(await db.prisma.auditEvent.count({ where: { entityType: 'CostCenter', action: 'CREATE' } })).toBe(1);
  });

  it('creates a consumer aligned to a cost center', async () => {
    const cc = await costCenters.create({ code: 'CC', name: 'Desk' });
    const c = await consumers.create({ type: 'USER', name: 'trader-1', costCenterId: cc.id });
    expect(c.costCenterId).toBe(cc.id);
    expect(c.type).toBe('USER');
  });

  it('rejects a consumer with a non-existent cost center (no write)', async () => {
    await expect(
      consumers.create({ type: 'PROCESS', name: 'bot', costCenterId: 'does-not-exist' })
    ).rejects.toThrow();
    expect(await db.prisma.consumer.count()).toBe(0);
  });

  it('rejects a consumer aligned to an inactive cost center', async () => {
    const cc = await costCenters.create({ code: 'OLD', name: 'Closed Desk' });
    await costCenters.deactivate(cc.id);
    await expect(
      consumers.create({ type: 'USER', name: 'x', costCenterId: cc.id })
    ).rejects.toThrow();
  });
});
