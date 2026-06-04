# BUILD-GOVERNANCE.md — OpenMDIM

> How the Builder (Claude Code), Reviewer (CODEX), and Approver (human) interact on
> every work unit. `CLAUDE.md` governs Builder behavior; this file governs the
> **loop between the three roles**. The Build & QA Spec defines the *what*; this
> defines the *handoff mechanics*.

---

## 1. The unit of work

Everything happens at the granularity of one **work unit (WU)** from Build Spec §5.
One WU = one branch = one PR = one review = one approval. WUs are done in order
(WU-0 -> WU-17); a later WU does not start until the prior one is approved.

---

## 2. The loop (per work unit)

```
  +--------------------------------------------------------------+
  | 1. BUILDER                                                   |
  |    - reads CLAUDE.md + CURRENT-STATE.md + Build Spec/Design   |
  |    - confirms the WU + criteria with human (one line)        |
  |    - states root cause / plan                                |
  |    - implements smallest correct increment                   |
  |    - writes the tests the criteria require                   |
  |    - produces an evidence block per criterion                |
  |    - updates CURRENT-STATE.md                                |
  |    - opens PR titled "WU-<n>: <title>"                       |
  +------------------------------+-------------------------------+
                                 |
  +------------------------------v-------------------------------+
  | 2. CI (automated gate, must be green before review)          |
  |    typecheck . lint . import-boundary . unit+integration     |
  |    (real Postgres) . coverage thresholds . prisma migrate-   |
  |    diff . OpenAPI lint (WU-15+)                               |
  +------------------------------+-------------------------------+
                                 |
  +------------------------------v-------------------------------+
  | 3. REVIEWER (CODEX)                                          |
  |    - reviews against acceptance criteria BY ID only          |
  |    - RE-RUNS every evidence command (reproduce, don't trust) |
  |    - checks boundaries + universal criteria U.1-U.6          |
  |    - returns a verdict table: criterion -> PASS/FAIL + note  |
  +------------------------------+-------------------------------+
                                 |
             +-------------------+-------------------+
             | any FAIL                              | all PASS
  +----------v-----------+              +------------v-----------------+
  | BUILDER fixes one    |              | 4. HUMAN APPROVER            |
  | item at a time,      |              |    - reads verdict table     |
  | re-evidences;        |              |    - approves merge          |
  | CODEX re-runs only   |              |    - authorizes next WU      |
  | affected criteria    |              +------------+-----------------+
  +----------+-----------+                           |
             |                                       v
             +----> back to step 3      merge . update CURRENT-STATE.md . next WU
```

---

## 3. Responsibilities by role

### Builder (Claude Code)
- Owns: code, tests, evidence blocks, `CURRENT-STATE.md`, the PR.
- May not: merge, mark a WU done, start the next WU, or change scope.
- Must: tell the truth about state at all times (TRUTHMODE §2 in CLAUDE.md).

### Reviewer (CODEX)
- Owns: the verdict table.
- Reviews **against acceptance criteria only**, citing each criterion ID. Personal
  style preference is not grounds for FAIL.
- **Reproduces** every evidence command — a fix is unverified until CODEX re-runs it.
- **Blocks on missing tests**: a WU whose criteria require tests that aren't present
  is FAIL, even if the code looks correct.
- **No silent rewrites**: proposes changes as review comments; never commits over
  the Builder.
- Verdict is **binary per criterion**: PASS or FAIL with evidence. No "probably fine."

### Approver (human)
- Approves each WU's definition-of-done before the next begins.
- Arbitrates Builder/Reviewer disagreement.
- Is the only one who promotes a "Proposed" item into a real WU (scope control).

---

## 4. Verdict table format (CODEX output, required)

| Criterion | Verdict | Evidence reproduced / note |
|-----------|---------|----------------------------|
| WU-n.k    | PASS    | re-ran `<cmd>`; <result>   |
| WU-n.j    | FAIL    | exact discrepancy + file:line |
| U.3       | PASS    | changed-file coverage X% / Y% |

FAIL rows must state the **exact** discrepancy (expected vs actual, with location),
never "looks off" or "could be better."

---

## 5. Branch & PR rules

- Branch: `wu-<n>-<slug>` (e.g. `wu-4-inventory-graph`).
- PR title: `WU-<n>: <title>` — exactly the work-unit ID.
- One WU per PR. A PR touching files outside the WU's scope is rejected on sight.
- Conventional Commits in the body.
- PR description includes the evidence blocks; CODEX's verdict table goes in the
  review.

---

## 6. The TRUTHMODE reset

If at any point the Builder drifts — claiming success without evidence, creeping
scope, thrashing past the 15-minute cap — the human types **TRUTHMODE**. On that
keyword the Builder immediately stops, re-reads `CLAUDE.md` and `CURRENT-STATE.md`
in full, and resumes from the last *verified* state (not the last *claimed* state).

---

## 7. Definition of done (the only definition)

A work unit is done when, and only when:

1. All acceptance criteria for the WU have passing evidence blocks.
2. Universal criteria U.1-U.6 hold.
3. CI is green.
4. CODEX's verdict table is all-PASS.
5. The human has approved and authorized the next WU.

Anything short of all five = **in progress**. The Builder says so plainly.
