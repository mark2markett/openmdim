# CURRENT-STATE.md — OpenMDIM

> **Single source of truth for "where are we right now."** The Builder updates this
> at the end of every work unit. The Builder reads it at the start of every session.
> Keep it short and factual. No roadmap prose — that lives in the Build Spec.

_Last updated: 2026-06-04 · by: Builder (Claude Code)_

---

## NEXT WORK UNIT

**WU-1 — Data model (per Build & QA Spec §5).**

**BLOCKED — cannot start.** WU-1 defines the Prisma data model, which is the source
of truth for the schema (CLAUDE.md §6: "do not invent fields"). The two governing
specs that define WU-1's acceptance criteria and the entity design — **OpenMDIM System
Design v1.0** and **Build & QA Specification v1.0** — are referenced by CLAUDE.md but
are **not present in `governance/`** (only `.docx` placeholders were expected). They
must be added to `governance/` before WU-1 can begin; building a schema without them
would violate the no-invented-fields rule and the no-build-around-missing-dependency rule.

Action needed from the human: drop the two spec `.docx` (or their content) into
`governance/`, then confirm the WU-1 title + acceptance criteria so the Builder can
proceed per the session-start checklist.

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

- _(none — WU-0 is merged + VERIFIED; WU-1 is BLOCKED pending the spec `.docx`, see NEXT WORK UNIT.)_

---

## BROKEN / KNOWN ISSUES

_Anything observed to be failing, with the evidence (command + output) that shows it.
Empty is good. "I think X might be off" does not belong here — only reproduced
failures._

- **RESOLVED 2026-06-03 — Docker**: installed Docker Engine 29.5.3 inside WSL2 Ubuntu
  (no Docker Desktop / no reboot). `docker compose up --wait` brings all 3 services healthy.
  Note: a native Windows Postgres already owns `localhost:5432`, so the compose stack uses
  non-default host ports (Postgres 5433, Redis 6380, MinIO 9100/9101) to avoid collisions.
- **WU-1 BLOCKER — design `.docx` specs absent from `governance/`**: the System Design v1.0
  and Build & QA Spec v1.0 are referenced by CLAUDE.md but are not on disk. WU-0 didn't need
  their detail, but WU-1 (the Prisma data model) cannot start without them — the schema is the
  source of truth and fields may not be invented. Add them to `governance/` to unblock WU-1.

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
