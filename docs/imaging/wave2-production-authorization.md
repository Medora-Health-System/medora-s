# Wave 2 Production Authorization (Phase 2E.6C)

**Phase:** 2E.6C — production authorization audit  
**Date:** 2026-06-01  
**Predecessors:** Wave 1 production **COMPLETE** · 2E.6B staging **PASS** · commit **`52564a41`**  
**Supersedes:** Production execution authority in [`wave2-implementation-authorization.md`](wave2-implementation-authorization.md) (staging-only scope)

---

## 1. Authorization decision

| Decision | Value |
|----------|--------|
| **Phase 2E.6D — Wave 2 production seed** | **AUTHORIZED WITH CONDITIONS** |
| **MEDORA production execution** | **CONDITIONAL** — see §3 |
| **SAFE / NOT SAFE (execute now)** | **NOT SAFE** until live preflight §3-C1 **PASS** |

Wave 2 is **technically ready** (staging PASS, rollback/postflight/idempotency packages defined, governance design closed). **Operational gate:** live read-only production preflight must confirm the **80 / 37 / 0** baseline immediately before seed.

---

## 2. Scope authorized (upon conditions met)

| Batch | Rows |
|-------|-----:|
| **XR-2** | **53** |
| **CT-2** | **4** |
| **US-1** | **4** |
| **US tuple pass** | **15** mappings on **6** existing codes |
| **Total catalog inserts** | **61** |
| **Forecast active imaging** | **141** |

**Out of scope:** billing activation (W3), Phase 2D retirement, search changes, new classifiers, migrations.

---

## 3. Part 4 — Authorization matrix

| Gate | Item | Status | Evidence / owner |
|------|------|--------|------------------|
| **Governance** | 2E.6A design authorization | **PASS** | [`wave2-implementation-authorization.md`](wave2-implementation-authorization.md) |
| **Governance** | Enterprise Gate W2 open; Wave 2 slice | **PASS** | [`enterprise-imaging-gate-w2.md`](enterprise-imaging-gate-w2.md) |
| **Governance** | Wave 1 production stable | **PASS** | [`wave1-production-stabilization-audit.md`](wave1-production-stabilization-audit.md) |
| **Governance** | Per-wave clinical sign-off (Gate W2-O-02) | **OPEN** | Clinical lead — record before or with production window |
| **C1** | **Live production preflight** | **PENDING** | [`wave2-production-preflight.md`](wave2-production-preflight.md) §7 — Engineering |
| **C2** | Change window / execution owner | **OPEN** | Assign in operational ticket (see §6) |
| **C3** | Staging evidence | **PASS** | 2E.6B: `wave2-staging-validation.ts` all checks; active **141**; idempotency |
| **C4** | Rollback plan | **PASS** | [`wave2-rollback-plan.md`](wave2-rollback-plan.md) |
| **C5** | Idempotency plan | **PASS** | 2E.6B run-2: `61 studies, 0 aliases, 0 tuple aliases, 0 protocol updates` |
| **C6** | Postflight plan | **PASS** | [`wave2-production-execution-package.md`](wave2-production-execution-package.md) §3 |

### Conditions to clear **AUTHORIZED WITH CONDITIONS** → **AUTHORIZED**

| ID | Condition | Action |
|----|-----------|--------|
| **W2-P-01** | Execute live read-only preflight (§7 preflight doc) | All checks **PASS** on production |
| **W2-P-02** | Production API/deploy includes **`52564a41`** or later on `main` | Verify Railway medora-s service commit |
| **W2-P-03** | Record clinical sign-off for Wave 2 (61 rows + US tuple) | Gate W2-O-02 |
| **W2-P-04** | Name production execution owner + change window | Operational record |

*When W2-P-01 through W2-P-04 are satisfied, Medora may execute **2E.6D** per execution package.*

---

## 4. Staging evidence summary (C3 / C5)

| Metric | Staging (2E.6B) |
|--------|-----------------|
| Wave 2 studies seeded | **61** (53 / 4 / 4) |
| Wave 2 aliases | **85** |
| US tuple mappings applied | **15** |
| Tuple aliases (run 1) | **31** |
| Tuple protocol updates (run 1) | **2** (`US_ABDOMEN`, `US_SOFT`) |
| Idempotency run 2 | **0** new aliases; **0** protocol updates |
| Classifier FK completeness | **61/61** |
| Governance regression | **PASS** (`CT_HEAD`, `MRI_SPINE`, Wave 1 **37**) |

---

## 5. Remaining blockers

| Blocker | Severity | Resolution |
|---------|----------|------------|
| Live production preflight not recorded for 2E.6C | **Blocking** | Run [`wave2-production-preflight.md`](wave2-production-preflight.md) §7 |
| Clinical sign-off not on file | **Blocking** (Gate W2) | Clinical lead sign-off |
| Execution owner / window | **Blocking** (operations) | Ticket assignment |
| Workbook `WORKBOOK_DRAFT` status | **Non-blocking** for seed | Product may promote status in parallel |

---

## 6. Production execution owner (template)

| Role | Name / team | Date |
|------|-------------|------|
| **Execution owner** | _TBD — Engineering_ | |
| **Clinical approver** | _TBD — Clinical lead_ | |
| **Rollback owner** | _TBD — Engineering_ | |
| **Postflight verifier** | _TBD — Engineering + QA_ | |

---

## 7. SAFE determination

| Scope | Verdict |
|-------|---------|
| **Authorization package (2E.6C)** | **SAFE** — complete; conditions explicit |
| **Production seed execution (today)** | **NOT SAFE** — live preflight + sign-offs pending |
| **After W2-P-01…04 cleared** | **SAFE** to execute 2E.6D per execution package |

---

## 8. Related artifacts

| Document | Role |
|----------|------|
| [`wave2-production-preflight.md`](wave2-production-preflight.md) | C1 preflight |
| [`wave2-production-execution-package.md`](wave2-production-execution-package.md) | 2E.6D runbook |
| [`wave2-staging-validation-plan.md`](wave2-staging-validation-plan.md) | Validation criteria |
| [`wave1-wave2-impact-assessment.md`](wave1-wave2-impact-assessment.md) | Non-blocking adoption notes |

---

*No production writes in 2E.6C.*
