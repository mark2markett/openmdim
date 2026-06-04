# OpenMDIM

Open-source **market data inventory management system** for the buy-side consumer
(banks, asset managers, hedge funds, family offices) — managing market-data spend,
entitlements, and vendor compliance.

> Status: **WU-0 (Scaffold & CI)** in progress. This is infrastructure only — no
> data model or features yet. See `governance/CURRENT-STATE.md` for the authoritative
> current state and `governance/` for the operating contracts.

## Stack

TypeScript · NestJS (`apps/api`) · Vite + React (`apps/web`) · BullMQ/Redis worker
(`apps/worker`) · Prisma · PostgreSQL 16 · MinIO · pnpm monorepo.

## Layout

```
apps/
  api/        NestJS HTTP API (GET /health)
  web/        Vite + React frontend
  worker/     BullMQ background worker (bootstrap; no jobs yet)
packages/
  domain/     domain model / bounded contexts (empty until WU-1+)
  db/         Prisma schema + client (datasource only until WU-1)
  contracts/  shared API contracts / DTOs
  adapters/   external-service adapters
governance/   CLAUDE.md contract, BUILD-GOVERNANCE.md, CURRENT-STATE.md, specs
.github/      CI workflows
helm/         deployment charts (placeholder)
```

## Prerequisites

- Node.js >= 20
- pnpm 9 (`corepack prepare pnpm@9.15.0 --activate`)
- Docker + Docker Compose (for local Postgres/Redis/MinIO)

## How to run (local dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Start local services (Postgres 16, Redis, MinIO)
#    Host ports are non-default to avoid collisions: Postgres 5433, Redis 6380,
#    MinIO 9100 (API) / 9101 (console).
docker compose up -d
docker compose ps      # all three should be "healthy"

# 3. Configure env
cp .env.example .env   # fill in local values (examples are inline in .env.example)

# 4. Run the API (boots on :3000)
pnpm --filter @openmdim/api start
curl http://localhost:3000/health    # -> {"status":"ok",...}

# 5. Run the web app (Vite dev server on :5173)
pnpm --filter @openmdim/web dev
```

## Quality gates

```bash
pnpm -r typecheck      # tsc --noEmit across all packages
pnpm lint              # eslint (includes the import-boundary stub)
pnpm test              # vitest (placeholder smoke test in WU-0)
pnpm format            # prettier --check
```

## License

MIT — see `LICENSE`.
