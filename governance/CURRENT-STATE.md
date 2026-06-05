# CURRENT-STATE.md — OpenMDIM

> **Single source of truth for "where are we right now."** The Builder updates this
> at the end of every work unit. The Builder reads it at the start of every session.
> Keep it short and factual. No roadmap prose — that lives in the Build Spec.

_Last updated: 2026-06-04 · by: Builder (Claude Code)_

---

## NEXT WORK UNIT

**WU-1 — Data model (Catalog · Commercial · Org · Entitlement · Audit).**

UNBLOCKED — the governing specs now exist: `governance/SYSTEM-DESIGN.md` (v1.0, data
model) and `governance/BUILD-SPEC.md` (§5 WU-1, criteria WU-1.1–1.7 + U.1–U.6),
authored 2026-06-04 via brainstorm. Core decisions: single-tenant (instance-per-client);
spend & per-seat allocation; per-seat cost = Subscription.baseFee + Σ selected AddOn.fee;
each Consumer aligned to one CostCenter.

**Pending before build starts:** (1) human review/ratification of SYSTEM-DESIGN.md +
BUILD-SPEC.md (currently in a docs PR); (2) implementation plan via writing-plans;
(3) one-line WU-1 confirmation per the session-start checklist. Do not start WU-2 until
WU-1 is approved.

---

## VERIFIED (shipped + evidenced + approved)

_Nothing yet. This section lists only work units with an all-PASS CODEX verdict and
human approval. Each entry: WU id, one line, date, PR link._

- **WU-0 — Scaffold & CI** · 2026-06-04 · PR #1 (squashed to `c8af6c5`). pnpm monorepo +
  NestJS `/health` + Vite web + BullMQ worker + Prisma datasource + docker stack
  (PG16/Redis/MinIO) + vitest workspace (e2e + real-Postgres integration) + GitHub Actions
  CI + import-boundary lint. CODEX-reviewed (all 11 criteria PASS; WU-0.9 by Approver
  arbitration); CI green; human-approved + merged.

---

## IN PROGRESS

_The one work unit currently being built. Should match NEXT WORK UNIT once started._

- **WU-1 — Data model** (started 2026-06-04, branch `wu-1-data-model`). Built on a real
  Postgres; full suite green (31 tests). NOT done — awaiting CI green on the PR, CODEX
  all-PASS, and human approval.

  **Locally verified (evidence in PR):**
  - WU-1.1 schema (10 models) + clean migration + empty `migrate diff`.
  - WU-1.2 Money value object (4-col embedding) + monthly base-currency normalization (7 unit tests).
  - WU-1.3 per-context modules; cross-context access via services only; lint blocks cross-context
    repository imports (proven via probe).
  - WU-1.4 `withAudit` writes row + AuditEvent atomically; forced rollback leaves neither.
  - WU-1.5 soft-delete only; deactivating a Subscription cascades to its active Assignments in-tx.
  - WU-1.6 per-consumer / per-cost-center cost + over/under-provisioning, period+currency normalized.
  - WU-1.7 integration tests on a real Postgres (Testcontainers in CI / compose locally);
    changed-file coverage lines 85% / branches 96% (>= 80/70).
  - U.1 typecheck + lint clean.

  Active-uniqueness for (consumer, subscription) is service-enforced (Prisma can't model partial
  unique indexes; keeps `migrate diff` clean). Contexts are plain TS module folders (no NestJS DI
  yet — not needed until endpoints in a later WU).

  **CODEX review (PR #4):** first pass NOT-PASS (7 FAIL). Builder fixed: audit every child write
  (WU-1.4), add-on dedup (WU-1.1), real ISO-4217 validation (WU-1.2), rollup excludes inactive
  add-ons (WU-1.6), CI coverage gate (WU-1.7/U.3). Re-review: 6/7 PASS. WU-1.2: CODEX flagged the
  hardcoded currency set as not synced to the latest ISO amendments; Approver arbitrated (2026-06-04)
  that the Money VO + ISO-4217 validation meets the criterion, with a maintained-reference follow-up
  (see PROPOSED) → WU-1.2 PASS. Net: all 7 criteria + U.1–U.6 PASS. CI green.

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
