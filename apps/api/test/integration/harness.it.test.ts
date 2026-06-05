import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDb, truncateAll, type TestDb } from '../support/pg-testcontainer';

describe('integration harness', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await startTestDb();
  });
  afterAll(async () => {
    await db.stop();
  });

  it('connects to a migrated real Postgres', async () => {
    await truncateAll(db.prisma);
    const vendors = await db.prisma.vendor.findMany();
    expect(vendors).toEqual([]);
  });
});
