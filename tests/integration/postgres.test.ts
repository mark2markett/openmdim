import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

// Integration test against a REAL Postgres (no mocks), per CLAUDE.md §6.
// - Locally: the docker-compose Postgres on localhost:5432.
// - CI: the GitHub Actions Postgres service on localhost:5432.
// Reads DATABASE_URL; fails loudly (never silently skips) if it is not set.
const databaseUrl = process.env.DATABASE_URL;

describe('Postgres connectivity (integration, real DB)', () => {
  let client: Client;

  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. Start the stack with `docker compose up -d` (local) ' +
          'or provide the CI Postgres service. Mock-only DB testing is not allowed.'
      );
    }
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  it('executes SELECT 1 against the live database', async () => {
    const res = await client.query<{ ok: number }>('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
  });

  it('is running PostgreSQL 16', async () => {
    const res = await client.query<{ server_version: string }>('SHOW server_version');
    expect(res.rows[0].server_version).toMatch(/^16\./);
  });
});
