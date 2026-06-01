# Wave 4 Production Authorization (Phase 2E.8C / 2E.8C.1)

**Phase:** 2E.8C — production authorization · **2E.8C.1** — W4-P-01 closure  
**Date:** 2026-06-01  
**Minimum seed commit:** `103b05ec`  
**Supersedes:** N/A (initial 2E.8C package)

**Inputs:** [`wave4-production-preflight.md`](wave4-production-preflight.md) · [`wave4-implementation-authorization.md`](wave4-implementation-authorization.md) · [`wave4-rollback-plan.md`](wave4-rollback-plan.md) · [`wave4-staging-validation-plan.md`](wave4-staging-validation-plan.md) · [`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md)

---

## 1. Authorization decision

| Field | Value |
|-------|--------|
| **PHASE 2E.8D — Wave 4 Production Execution** | **AUTHORIZED WITH CONDITIONS** |
| **Condition** | **W4-P-01** — live production baseline **182 / 37 / 61 / 41 / 0** W4 verified |
| **After W4-P-01 closure (2E.8C.1)** | **AUTHORIZED** |
| **Medora governance (catalog expansion)** | **APPROVED** |
| **Wave 4 production authorization readiness** | **READY** |
| **Production execution (2E.8D)** | **NOT YET** |
| **SAFE / NOT SAFE (authorize 2E.8D)** | **SAFE** |
| **SAFE / NOT SAFE (execute production seed)** | **SAFE** *(after W4-P-01 only)* |

**Rationale:** Wave 4 staging at `103b05ec` — **31** rows, **72** aliases, **22/22** validation **PASS**, idempotent run 2 (**0** new aliases), active **213**. Wave 3 production **STABILIZED** at **182** active. Combined `wave4-staging-validation.ts` `pass: false` pre-deploy is **expected** (post-seed checks). Rollback, idempotency, and postflight documented.

**W4-P-01:** Agent session could not run live Railway queries (CLI auth). Operator must execute preflight commands in [`wave4-production-preflight.md`](wave4-production-preflight.md) §7 before seed. Upon confirmation, update this document to **AUTHORIZED** (2E.8C.1) — same pattern as [Wave 3 — 2E.7C.1](wave3-production-authorization.md).

---

## 2. Gate status table

| Gate | Item | Status |
|------|------|--------|
| **W4-P-01** | Production baseline (**182** / **37** / **61** / **41** / **0** W4 / governance) | **OPEN** |
| **W4-P-02** | Staging implementation (`103b05ec`) | **CLOSED** |
| **W4-P-03** | Staging validation **22/22 PASS** | **CLOSED** |
| **W4-P-04** | Governance / design (2E.8A, 2E.2A–2E.2B) | **CLOSED** |
| **W4-P-05** | Rollback plan | **CLOSED** |
| **W4-P-06** | Deployable code includes Wave 4 seed (`103b05ec`) | **CLOSED** |
| **W4-P-07** | Execution ownership | **CLOSED** |
| **W4-P-08** | Idempotency + postflight plan | **CLOSED** |

**Remaining blockers for 2E.8D:** **W4-P-01** only

### After W4-P-01 operator verification (2E.8C.1)

| Gate | Item | Status |
|------|------|--------|
| **W4-P-01** | Production baseline verified live | **CLOSED** |
| **Authorization decision** | **AUTHORIZED** (unconditional for 2E.8D) |
| **Remaining blockers** | **NONE** |

---

## 3. Readiness classification

| Criterion | Classification | Evidence |
|-----------|----------------|----------|
| **Governance approval** | **APPROVED** | 2E.8A · Wave 3 prod SAFE |
| **Staging evidence** | **APPROVED** | `103b05ec` · 31 rows · 72 aliases · 213 active staging |
| **Production preflight (W4-P-01)** | **CONDITIONAL** | Operator live validation — [`wave4-production-preflight.md`](wave4-production-preflight.md) |
| **Rollback plan** | **APPROVED** | [`wave4-rollback-plan.md`](wave4-rollback-plan.md) |
| **Idempotency plan** | **APPROVED** | Staging run 2: `31 studies, 0 aliases` |
| **Postflight plan** | **APPROVED** | `wave4-staging-validation.ts` — full PASS post-seed |
| **Production execution owner** | **ASSIGNED** | Authorized operator |

---

## 4. Production impact

### Before Wave 4 (expected production — now)

| Metric | Value |
|--------|------:|
| Active imaging | **182** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 active | **41** |
| Wave 4 active | **0** |
| Wave 4 aliases | **0** |

### After Wave 4 (2E.8D target)

| Metric | Value |
|--------|------:|
| Active imaging | **213** |
| Wave 4 active | **31** |
| Wave 4 aliases | **~72** |
| XR-3 / CT-3 | **7 / 24** |
| Validation script | **22/22 PASS** (`summary.pass: true`) |

---

## 5. Execution reference

Execute per [`wave4-production-execution-package.md`](wave4-production-execution-package.md):

1. `prisma:seed-catalogs` (run 1) — expect `31 studies, ~72 aliases`  
2. `wave4-staging-validation.ts` — expect **full PASS**  
3. Idempotent seed (run 2) — expect `0` new aliases  

---

## 6. Out of scope (2E.8D)

| Item | Phase |
|------|--------|
| Billing / CPT activation | Gate W3 (future) |
| Search engine changes | Not in Wave 4 seed |
| Phase 2D retirement execution | Separate |
| XR-3b optional parity (+33) | Separate authorization |

---

## 7. Verdict summary

| Question | Answer |
|----------|--------|
| Authorization decision (2E.8C) | **AUTHORIZED WITH CONDITIONS** |
| After W4-P-01 verification | **AUTHORIZED** |
| Wave 4 production authorization readiness | **READY** |
| Production execution | **NOT YET** |
| Remaining blockers | **W4-P-01** |
| **SAFE / NOT SAFE** | **SAFE** |

---

*Companion: [`wave4-production-execution-package.md`](wave4-production-execution-package.md)*
