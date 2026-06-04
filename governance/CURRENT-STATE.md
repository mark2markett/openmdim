# CURRENT-STATE.md — OpenMDIM

> **Single source of truth for "where are we right now."** The Builder updates this
> at the end of every work unit. The Builder reads it at the start of every session.
> Keep it short and factual. No roadmap prose — that lives in the Build Spec.

_Last updated: 2026-06-03 · by: Builder (Claude Code)_

---

## NEXT WORK UNIT

**WU-0 — Scaffold & CI**

Acceptance criteria to satisfy: WU-0.1…(see Build Spec §5/§6) + universal U.1–U.6.

Definition of done (summary): monorepo created; Docker Compose brings up
Postgres + Redis + MinIO; CI runs lint + typecheck + test on every push; an empty
NestJS app boots and `/health` returns green; one PR titled `WU-0`.

**Do not start WU-1 until WU-0 is human-approved.**

---

## VERIFIED (shipped + evidenced + approved)

_Nothing yet. This section lists only work units with an all-PASS CODEX verdict and
human approval. Each entry: WU id, one line, date, PR link._

- _(none)_

---

## IN PROGRESS

_The one work unit currently being built. Should match NEXT WORK UNIT once started._

- **WU-0 — Scaffold & CI** (started 2026-06-03). Local scaffold + verification complete;
  three external-service steps prepared and awaiting human authorization. NOT done — no
  CODEX verdict, no human approval yet (BUILD-GOVERNANCE §7).

  **Locally verified (evidence in PR):**
  - pnpm monorepo (apps/api·web·worker, packages/domain·db·contracts·adapters) installs clean.
  - `pnpm run typecheck` clean (7 projects + tests/tsconfig); `pnpm lint` clean (incl. import-boundary stub).
  - `pnpm test` green: 4 tests — smoke, REAL-Postgres integration (SELECT 1 + server_version ^16.),
    and Nest `/health` e2e (supertest). Failing-canary proven to flip the gate red then green.
  - NestJS API boots; `GET /health` → HTTP 200 `{"status":"ok",...}`.
  - `prisma validate` passes; datasource reads DATABASE_URL/DIRECT_URL.
  - web builds to deployable `dist/`; worker compiles.
  - Docker (in WSL2) `docker compose up --wait` → Postgres 16 + Redis + MinIO all healthy.
  - `.github/workflows/ci.yml` present (install·typecheck·lint·test + Postgres/Redis services).

  **Pending human authorization (Builder prepared commands):**
  - Vercel: `vercel link` / deploy of `apps/web` (vercel.json present).
  - Supabase: `supabase login`/`init`/`link` + pull connection strings (supabase/config.toml present).

  **In flight:**
  - GitHub: repo + branch `wu-0-scaffold-and-ci` + PR being created under `mark2markett`;
    real CI run on the PR satisfies WU-0.7.

---

## BROKEN / KNOWN ISSUES

_Anything observed to be failing, with the evidence (command + output) that shows it.
Empty is good. "I think X might be off" does not belong here — only reproduced
failures._

- **RESOLVED 2026-06-03 — Docker**: installed Docker Engine 29.5.3 inside WSL2 Ubuntu
  (no Docker Desktop / no reboot). `docker compose up --wait` brings all 3 services healthy.
  Note: a native Windows Postgres already owns `localhost:5432`, so the compose stack uses
  non-default host ports (Postgres 5433, Redis 6380, MinIO 9100/9101) to avoid collisions.
- **OpenMDIM design `.docx` specs absent from `governance/`**: the System Design v1.0 and
  Build & QA Spec v1.0 are referenced by CLAUDE.md but are not on disk. They should be
  dropped into `governance/` so a fresh session can read §4.1/§5/§6 directly.

---

## PROPOSED (not started)

_Ideas and out-of-scope improvements spotted during building. Captured here instead
of acted on (no scope creep). The human promotes these into real work units._

- Add `@nestjs/terminus` for a richer `/health` (DB/Redis readiness probes) once those
  dependencies exist — deferred; the plain controller satisfies WU-0.
- Wire `prisma migrate diff` and OpenAPI lint into CI (BUILD-GOVERNANCE §2 lists them for
  later WUs; not applicable until a schema/API exists).
- Tighten the import-boundary stub into a real per-context rule set (e.g. `import/no-restricted-paths`
  zones) when bounded contexts land in WU-1+.

---

## ENVIRONMENT NOTES

_Anything a fresh session needs to know: required env vars, ports, how to run the
stack, gotchas. Fill in during WU-0._

- Stack: TypeScript · NestJS · Prisma · PostgreSQL 16 · React (Vite) · BullMQ/Redis · MinIO
- Toolchain (verified 2026-06-03): node v24.14.1 · pnpm 9.15.0 (via corepack) · git 2.53 ·
  gh 2.92 (authed `mark2markett`) · vercel CLI 53.3.1 · Docker 29.5.3 + Compose v5.1.4 (in WSL2 Ubuntu).
  MISSING: Supabase CLI (only needed when you link the managed DB).
- Install: `corepack prepare pnpm@9.15.0 --activate && pnpm install`
- Services: run from WSL — `docker compose up -d --wait` then `docker compose ps`. Host ports:
  Postgres 5433, Redis 6380, MinIO 9100 (console 9101). (Windows host already uses 5432.)
- Run API: `pnpm --filter @openmdim/api build && pnpm --filter @openmdim/api start` → :3000,
  `GET /health`. Run web: `pnpm --filter @openmdim/web dev` → :5173.
- Gates: `pnpm run typecheck` · `pnpm lint` · `pnpm test` · `pnpm format`.
  Tests need the stack up + env set: `DATABASE_URL=postgresql://openmdim:openmdim@localhost:5433/openmdim?schema=public`.
- Env: copy `.env.example` → `.env` (names only in example; never commit real values).
- Tests: vitest workspace — root (smoke + real-Postgres integration via `pg`) + api-e2e (supertest).
  Testcontainers (ephemeral isolated DB per suite) adopted in WU-1 when schema/migrations need it.
- Repo root: `c:\Users\Administrator\github\openmdim`. Remote: github.com/mark2markett/openmdim (WU-0).
