# CURRENT-STATE.md — OpenMDIM

> **Single source of truth for "where are we right now."** The Builder updates this
> at the end of every work unit. The Builder reads it at the start of every session.
> Keep it short and factual. No roadmap prose — that lives in the Build Spec.

_Last updated: 2026-06-04 · by: Builder (Claude Code)_

---

## NEXT WORK UNIT

**WU-2 — Actuals/Billing (invoices + budget-vs-actual)** (per BUILD-SPEC §5 roadmap).

Not started. Criteria are defined when the human promotes WU-2 (BUILD-SPEC §5 lists it as
a proposed roadmap item; exact acceptance criteria authored at promotion). Builds on the
WU-1 data model (contracts/subscriptions/cost rollup) to reconcile contracted cost vs
actual invoices. **Do not start until WU-1 is approved (done) and the human authorizes WU-2**
with a one-line confirmation per the session-start checklist.

---

## VERIFIED (shipped + evidenced + approved)

_Nothing yet. This section lists only work units with an all-PASS CODEX verdict and
human approval. Each entry: WU id, one line, date, PR link._

- **WU-0 — Scaffold & CI** · 2026-06-04 · PR #1 (squashed to `c8af6c5`). pnpm monorepo +
  NestJS `/health` + Vite web + BullMQ worker + Prisma datasource + docker stack
  (PG16/Redis/MinIO) + vitest workspace (e2e + real-Postgres integration) + GitHub Actions
  CI + import-boundary lint. CODEX-reviewed (all 11 criteria PASS; WU-0.9 by Approver
  arbitration); CI green; human-approved + merged.
- **WU-1 — Data model** · 2026-06-04 · PR #4 (squashed to `ad9205f`). Prisma schema (10 models:
  Vendor/DataProduct/AddOn, Contract/Subscription, CostCenter/Consumer, Assignment/AssignmentAddOn,
  AuditEvent) + migration; Money value object; per-context services (catalog/commercial/org/
  entitlement) with atomic AuditEvent on every write, soft-delete cascade, and entitlement
  invariants; per-seat cost rollup + provisioning. 33 tests on a real Postgres (Testcontainers in
  CI), coverage 84%/95%. CODEX-reviewed (7 FAIL → fixed; WU-1.2 by Approver arbitration); CI green;
  human-approved + merged.

---

## IN PROGRESS

_The one work unit currently being built. Should match NEXT WORK UNIT once started._

- _(none — WU-1 is merged + VERIFIED. WU-2 not yet started/authorized.)_

---

## BROKEN / KNOWN ISSUES

_Anything observed to be failing, with the evidence (command + output) that shows it.
Empty is good. "I think X might be off" does not belong here — only reproduced
failures._

- **RESOLVED 2026-06-03 — Docker**: installed Docker Engine 29.5.3 inside WSL2 Ubuntu
  (no Docker Desktop / no reboot). `docker compose up --wait` brings all 3 services healthy.
  Note: a native Windows Postgres already owns `localhost:5432`, so the compose stack uses
  non-default host ports (Postgres 5433, Redis 6380, MinIO 9100/9101) to avoid collisions.
- **RESOLVED 2026-06-04 — governing specs authored**: System Design v1.0 + Build & QA Spec v1.0
  now exist as `governance/SYSTEM-DESIGN.md` and `governance/BUILD-SPEC.md` (authored via brainstorm,
  pending human ratification in a docs PR). WU-1 is no longer blocked.

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
- **Replace the hardcoded ISO-4217 currency set** (`packages/domain/src/money.ts`) with a maintained
  currency reference — the hardcoded list drifts against ISO amendments. (From WU-1 CODEX review;
  Approver accepted WU-1.2 as met with this as the follow-up.)
- Consider DB-level active-uniqueness (partial unique index applied outside the Prisma schema, or a
  generated key column) if concurrency makes the service-level `(consumer, subscription)` check insufficient.

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
