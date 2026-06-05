import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { withAudit } from '@openmdim/db';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';

describe('withAudit (atomicity, WU-1.4)', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await startTestDb();
  });
  afterAll(async () => {
    await db.stop();
  });
  beforeEach(async () => {
    await truncateAll(db.prisma);
  });

  it('writes the row + an AuditEvent in one transaction', async () => {
    const vendor = await withAudit(
      db.prisma,
      { entityType: 'Vendor', action: 'CREATE', actor: 'system' },
      (tx) => tx.vendor.create({ data: { name: 'Bloomberg', code: 'BBG' } }),
      (created) => ({ entityId: created.id, changes: created })
    );
    expect(vendor.code).toBe('BBG');
    const events = await db.prisma.auditEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].entityId).toBe(vendor.id);
    expect(events[0].action).toBe('CREATE');
  });

  it('rolls back BOTH on failure — no row, no orphan audit', async () => {
    await expect(
      withAudit(
        db.prisma,
        { entityType: 'Vendor', action: 'CREATE', actor: 'system' },
        async (tx) => {
          await tx.vendor.create({ data: { name: 'X', code: 'DUP' } });
          return tx.vendor.create({ data: { name: 'Y', code: 'DUP' } }); // unique violation
        },
        (created) => ({ entityId: created.id, changes: created })
      )
    ).rejects.toThrow();

    expect(await db.prisma.vendor.findMany()).toHaveLength(0);
    expect(await db.prisma.auditEvent.findMany()).toHaveLength(0);
  });
});
