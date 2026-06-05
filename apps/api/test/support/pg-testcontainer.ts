import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@openmdim/db';

export interface TestDb {
  prisma: PrismaClient;
  stop: () => Promise<void>;
}

/**
 * Provides a real Postgres for integration tests.
 *
 * - CI / native-Docker: spins an ephemeral Testcontainers Postgres 16 and runs
 *   `prisma migrate deploy` into it (isolated per call).
 * - Local (Windows, no Docker daemon exposure): set `OPENMDIM_TEST_DATABASE_URL`
 *   to the already-migrated docker-compose Postgres (localhost:5433). Still a real
 *   Postgres; integration files run sequentially (see apps/api/vitest.config.ts) so
 *   `truncateAll` between tests is safe.
 */
export async function startTestDb(): Promise<TestDb> {
  const provided = process.env.OPENMDIM_TEST_DATABASE_URL;
  if (provided) {
    const prisma = new PrismaClient({ datasources: { db: { url: provided } } });
    return { prisma, stop: () => prisma.$disconnect() };
  }

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine'
  ).start();
  const url = container.getConnectionUri();
  execSync('pnpm --filter @openmdim/db run db:deploy', {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'inherit'
  });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return {
    prisma,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    }
  };
}

/** Clear all data tables (schema preserved) between tests. */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AssignmentAddOn","Assignment","Subscription","Contract",` +
      `"AddOn","DataProduct","Consumer","CostCenter","Vendor","AuditEvent" RESTART IDENTITY CASCADE;`
  );
}
