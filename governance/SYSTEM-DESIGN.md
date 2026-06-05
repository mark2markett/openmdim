# OpenMDIM — System Design v1.0

> Governing document #1 (architecture + data model). Sits above `CLAUDE.md` and wins
> on conflict. Authored 2026-06-04 via brainstorm; ratified by the human Approver.
> The Prisma schema is the source of truth for the data model; this document is the
> intent the schema must realize. If schema and this doc disagree, fix one deliberately
> (a schema change is its own step) — do not silently diverge.

---

## 1. What OpenMDIM is

An open-source **market data inventory management system** for the buy-side consumer
(banks, asset managers, hedge funds, family offices). It answers: *what market-data
products do we pay for, who consumes them, and what does each cost center spend?*

**Deployment model:** cloud-hosted, **one isolated instance per client firm**. The
schema is therefore **single-tenant** — no `tenant_id`/`Organization` root, no
row-level isolation. Internal legal entities/desks are modeled as cost centers, which
is a different concern from SaaS multi-tenancy.

**v1.0 primary job:** spend & contract management with **per-seat cost allocation** —
each consumer's composed per-seat cost rolls up to exactly one cost center.

---

## 2. Bounded contexts

| Context | Owns | In v1.0 (WU-1)? |
|---------|------|-----------------|
| **Catalog** | Vendor, DataProduct, AddOn — the inventory + list prices | Yes |
| **Commercial** | Contract, Subscription — agreements + per-seat base fees | Yes |
| **Org** | CostCenter, Consumer — who incurs cost, where it lands | Yes |
| **Entitlement** | Assignment, AssignmentAddOn — who holds what (drives cost) | Yes |
| **Audit** | AuditEvent — cross-cutting, every write | Yes |
| Actuals/Billing | invoices, budget-vs-actual | Deferred (WU-2) |
| Usage | access telemetry, waste detection | Deferred (WU-3) |
| Compliance | vendor declarations, usage reporting | Deferred (WU-4) |
| Reporting | materialized rollups / dashboards | Deferred (WU-5) |
| App identity | OpenMDIM's own users/roles/auth | Deferred (WU-6) |

Each context is its own module with a **service interface**. Repositories are
per-module; cross-context reads go only through services (import-boundary rule,
CLAUDE.md §6). The Prisma client lives in `@openmdim/db`; domain value objects (e.g.
`Money`) in `@openmdim/domain`.

> **Consumer ≠ app user.** A `Consumer` is a market-data user *or* automated process
> at the firm (the thing that occupies a seat). The people who operate OpenMDIM itself
> are a separate identity concern, deferred to WU-6.

---

## 3. The value spine

```
Vendor ─< DataProduct ─< AddOn(FEED|OPTION, fee)
  │            │
  │            └────────────< Subscription >── Contract(vendor, term, status)
  │                              (baseFee, contractedSeats, period)
  │                                   │
CostCenter ─< Consumer ──< Assignment >┘
 (code,name)  (USER|       │   └─< AssignmentAddOn >── AddOn
              PROCESS,     │
              costCenterId)│
                           └─ per-seat cost = Subscription.baseFee
                                            + Σ selected AddOn.fee
costCenter spend  = Σ per-seat cost of its consumers' active assignments
over/under-provision = Subscription.contractedSeats vs count(active assignments)
```

Cost flows **bottom-up**: each active Assignment (a consumer occupying a seat on a
subscription, plus chosen add-ons) produces a composed per-seat cost; because each
Consumer aligns to exactly one CostCenter, costs roll up by membership — no split
percentages.

---

## 4. Entities

Conventions for **every** entity: `id` (`cuid()`), `isActive` (Boolean, default true —
soft delete; never hard-deleted), `createdAt`, `updatedAt`.

**Money value object** — embedded as four columns per monetary field:
`<field>Amount` (Decimal 18,4), `<field>Currency` (Char 3, ISO-4217),
`<field>FxRate` (Decimal 18,8), `<field>FxAsOf` (DateTime). Postgres has no Prisma
composite type, so the value object lives in `@openmdim/domain` and maps to/from these
columns. Rollups normalize to a base currency via `fxRate`.

### Catalog
- **Vendor** — `name`, `code` (unique), `description?`, `website?`. → DataProducts, Contracts.
- **DataProduct** — `vendorId`, `name`, `code` (unique per vendor), `category?`, `description?`. → AddOns, Subscriptions.
- **AddOn** — `dataProductId`, `kind` (`FEED`|`OPTION`), `name`, `code`, `fee` (Money, per-seat/period), `billingPeriod` (`MONTHLY`|`QUARTERLY`|`ANNUAL`).

### Commercial
- **Contract** — `vendorId`, `reference` (contract no.), `startDate`, `endDate?`, `status` (`DRAFT`|`ACTIVE`|`EXPIRED`|`TERMINATED`), `notes?`. → Subscriptions.
- **Subscription** — `contractId`, `dataProductId`, `baseFee` (Money, per-seat/period), `billingPeriod`, `contractedSeats?` (Int), `startDate?`, `endDate?`. → Assignments.

### Org
- **CostCenter** — `code` (unique), `name`, `owner?`. Flat in v1.0 (no hierarchy). → Consumers.
- **Consumer** — `type` (`USER`|`PROCESS`), `name`, `externalRef?`, `costCenterId` (**required**). → Assignments.

### Entitlement
- **Assignment** — `consumerId`, `subscriptionId`, `startsOn` (Date), `endsOn?` (null = active). Unique active `(consumerId, subscriptionId)`. → AssignmentAddOns.
- **AssignmentAddOn** — `assignmentId`, `addOnId`, `startsOn?`, `endsOn?`. Unique active `(assignmentId, addOnId)`.

### Audit
- **AuditEvent** — `entityType`, `entityId`, `action` (`CREATE`|`UPDATE`|`DEACTIVATE`), `actor`, `changes` (JSON diff), `occurredAt`. Inserted in the **same transaction** as the write it records.

---

## 5. Invariants & rules (enforced at the service boundary)

Controllers validate and delegate; business rules live in services, not controllers or SQL.

1. **No hard deletes.** Mutations set `isActive=false`. Deactivating a parent
   cascade-deactivates active children *in the same transaction* (e.g. deactivating a
   Subscription ends/deactivates its active Assignments). Not a DB cascade-delete.
2. **AuditEvent atomicity.** Every create/update/deactivate wraps the write + its
   `AuditEvent` insert in one Prisma `$transaction`. A forced rollback must leave
   neither the row nor an orphan audit row.
3. **Money discipline.** `amount ≥ 0`; `currency` valid ISO-4217; `fxRate > 0`;
   `fxAsOf` present. No bare numeric money columns.
4. **Entitlement integrity.** `Assignment.endsOn ≥ startsOn`; cannot assign to a
   Subscription whose DataProduct is inactive; an `AssignmentAddOn.addOn` must belong
   to the **same DataProduct** as the Assignment's Subscription.
5. **Provisioning is advisory.** `contractedSeats` is a soft limit — exceeding it is
   allowed and surfaced as over-provisioning, never blocked.
6. **Uniqueness.** `Vendor.code`; `CostCenter.code`; `DataProduct.code` per vendor;
   active `(consumer, subscription)`; active `(assignment, addOn)`.

---

## 6. Derived computations (queried, not stored in v1.0)

> **Normalization.** A Subscription's `baseFee` and an AddOn's `fee` may carry
> different `billingPeriod`s and currencies. Before any sum or rollup, each fee is
> normalized to a **common basis: monthly, in a configured base currency** (annual ÷ 12,
> quarterly ÷ 3; currency via `fxRate`). All figures below are monthly-base-currency.

- **Per-consumer periodic cost** = `Subscription.baseFee + Σ selected AddOn.fee` over
  the consumer's active assignments (period- and currency-normalized).
- **Cost-center spend** = Σ per-consumer cost over consumers in that cost center.
- **Over/under-provisioning** = `Subscription.contractedSeats` vs count of active
  Assignments on that subscription.

Materialized/pre-aggregated reporting is deferred to WU-5; v1.0 supports these as
on-demand queries.

---

## 7. Out of scope for v1.0 (captured, not built)

Invoices/actuals & budget-vs-actual (WU-2); usage telemetry & waste detection (WU-3);
vendor compliance/declarations (WU-4); reporting rollups/dashboards (WU-5);
OpenMDIM app identity/RBAC (WU-6). Hierarchical cost centers and per-assignment fee
overrides are explicitly deferred until a real need appears.
