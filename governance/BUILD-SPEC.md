# OpenMDIM — Build & QA Specification v1.0

> Governing document #2 (work breakdown + acceptance criteria + evidence protocol).
> Sits above `CLAUDE.md`. Authored 2026-06-04; the System Design v1.0 is the companion
> (`governance/SYSTEM-DESIGN.md`). Work proceeds one Work Unit (WU) at a time, in order,
> each gated by CODEX verdict + human approval (`governance/BUILD-GOVERNANCE.md`).

---

## 1. Stack (committed)

TypeScript · NestJS (`apps/api`) · Vite + React (`apps/web`) · BullMQ/Redis worker
(`apps/worker`) · Prisma · PostgreSQL 16 · MinIO · pnpm monorepo. Established in WU-0.

## 2. Monorepo layout (§4.1)

`apps/{api,web,worker}` · `packages/{domain,db,contracts,adapters}` · `governance/` ·
`docker-compose.yml` · `.github/workflows/` · `helm/`. Established and VERIFIED in WU-0.

---

## 3. Universal acceptance criteria (U.1–U.6) — apply to every WU

- **U.1** Typecheck + lint clean (`pnpm run typecheck`, `pnpm lint`; import-boundary holds).
- **U.2** Unit + integration tests green against a **real Postgres** (Testcontainers); no mock-only DB.
- **U.3** Changed-file coverage ≥ 80% lines / ≥ 70% branches. *(N/A for WU-0, which has no feature code; binds from WU-1.)*
- **U.4** No cross-module repository access (read other contexts only via their service interface).
- **U.5** Evidence block attached per acceptance criterion (CLAUDE.md §4).
- **U.6** `governance/CURRENT-STATE.md` updated.

## 4. Evidence protocol

Per CLAUDE.md §4: every criterion carries an evidence block (exact command + trimmed
output showing PASS/FAIL + one-line proof + files touched). CODEX reproduces every
command; faking/trimming output to look like success is the most serious violation.

---

## 5. Work units

### WU-0 — Scaffold & CI  ✅ VERIFIED (2026-06-04, PR #1)

Monorepo, docker stack (PG16/Redis/MinIO), CI (typecheck/lint/test), NestJS `/health`,
Prisma datasource, import-boundary lint, vitest workspace. Criteria WU-0.1–0.11; all PASS.

### WU-1 — Data model (Catalog · Commercial · Org · Entitlement · Audit)

Implements the v1.0 data model from System Design §4–§6: the spend & per-seat allocation
backbone. **No UI, no actuals/usage/compliance** (those are later WUs). API surface limited
to what the criteria below require (repositories/services + minimal controllers if needed for
integration tests); rich endpoints can follow in a later WU.

**Acceptance criteria:**

- **WU-1.1 — Schema.** Prisma schema defines Vendor, DataProduct, AddOn, Contract,
  Subscription, CostCenter, Consumer, Assignment, AssignmentAddOn, AuditEvent with the
  fields, enums, relations, and unique constraints in System Design §4–§5. `prisma validate`
  passes; `prisma migrate dev` produces one clean migration; `prisma migrate diff` against the
  migrated DB is empty.
- **WU-1.2 — Money value object.** Each monetary field is the 4-column embedding
  (`*Amount`/`*Currency`/`*FxRate`/`*FxAsOf`). A `Money` value object in `@openmdim/domain`
  maps to/from those columns and round-trips in a test (incl. ISO-4217 + `fxRate>0` + `amount≥0`
  validation).
- **WU-1.3 — Module boundaries.** Per-context repositories/services in their own modules; no
  cross-module repository access (import-boundary lint green; a probe deep-import fails lint).
- **WU-1.4 — Audit atomicity.** Every create/update/deactivate writes its row + an AuditEvent in
  one `$transaction`. Test proves a forced rollback leaves neither the row nor an orphan audit row.
- **WU-1.5 — Soft delete.** No hard deletes; mutations set `isActive=false`; deactivating a
  Subscription cascade-deactivates its active Assignments in the same transaction (tested).
- **WU-1.6 — Cost rollup.** Given fixtures, per-consumer periodic cost
  (`baseFee + Σ addOn.fee`), per-cost-center spend, and over/under-provisioning vs
  `contractedSeats` compute correctly — fees normalized to a monthly base-currency basis
  (System Design §6) before summing; a test covers mixed periods/currencies.
- **WU-1.7 — Real-Postgres integration.** Repository/service + migration tests run against a real
  Postgres (Testcontainers) and pass in CI; coverage thresholds (U.3) met on changed files.
- Plus **U.1–U.6**.

**Definition of done:** all WU-1.1–1.7 + U.1–U.6 evidenced; one PR titled `WU-1`; CODEX all-PASS;
human approved.

### WU-2..WU-6 — Proposed roadmap (ratified when reached)

- **WU-2** Actuals/Billing — invoices, budget-vs-actual reconciliation.
- **WU-3** Usage — access telemetry, entitled-but-unused (waste) detection.
- **WU-4** Compliance — vendor license declarations, usage reporting, audit packs.
- **WU-5** Reporting — materialized rollups + dashboard read models; web UI surfaces.
- **WU-6** App identity — OpenMDIM users/roles/auth (RBAC over the above).

Exact criteria for WU-2+ are defined when each is promoted by the human Approver.
