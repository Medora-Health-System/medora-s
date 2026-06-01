# Wave 2 Implementation Authorization (Phase 2E.6A)

**Phase:** 2E.6A  
**Date:** 2026-05-31  
**Authority:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) (`wave=2`, **61** rows)  
**Predecessor:** Wave 1 production **COMPLETE** · [`wave1-production-stabilization-audit.md`](wave1-production-stabilization-audit.md) **PASS**

---

## 1. Return summary

| Metric | Value |
|--------|------:|
| **Wave 2 row count** | **61** |
| **XR-2 / CT-2 / US-1** | **53 / 4 / 4** |
| **Alias count (est.)** | **~65–85** strings |
| **Required alias codes** | **2** |
| **Billing review count** | **61** |
| **Classifier completeness (required slots)** | **100%** (61/61) |
| **Gate W2 (enterprise)** | **OPEN** (Waves 2–4) |
| **2E.6B staging implementation** | **YES** |
| **2E.6B readiness** | **READY** |
| **SAFE / NOT SAFE** | Design **SAFE** · Production apply **NOT SAFE** (staging only) |

---

## 2. Part 1 — Authoritative inventory

| Batch | Count |
|-------|------:|
| XR-2 | 53 |
| CT-2 | 4 |
| US-1 | 4 |
| **Total** | **61** |

**Audits:** duplicate codes **0** · collision Wave 1 **0** · collision Haiti 44 **0** · forbidden codes **0** · retirement **PASS**.

Full listing: [`wave2-implementation-inventory.md`](wave2-implementation-inventory.md).

---

## 3. Part 2 — Alias package

| Class | Count |
|-------|------:|
| REQUIRED | **2** codes |
| OPTIONAL | **59** codes |
| US tuple (parallel) | **15** protocols |

Details: [`wave2-alias-package.md`](wave2-alias-package.md).

---

## 4. Part 3 — Classifier validation

| Slot | XR-2 | CT-2 | US-1 | Total complete |
|------|-----:|-----:|-----:|---------------:|
| Modality | 53/53 | 4/4 | 4/4 | **61/61** |
| Body region | 53/53 | 4/4 | 4/4 | **61/61** |
| Contrast | 53/53 | 4/4 | 4/4 | **61/61** |
| Laterality | 53/53 | 4/4 | 4/4 | **61/61** |
| View count | 53/53 | — | — | **53/53** (CT/US N/A) |
| Anatomic subregion | per workbook | — | 3/4 + chest N/A | **PASS** |
| Protocol | 2 knee sunrise | — | — | **PASS** |

| Metric | Value |
|--------|------:|
| **Missing required assignments** | **0** |
| **Classifier gaps (ICM)** | **0** |
| **MRI_SPINE B1B regression** | Required at staging — contrast **NULL** |

All classifier codes in workbook resolve to ICM-1.0 seeded vocabulary.

---

## 5. Part 4 — Billing package

| State | Count |
|-------|------:|
| billing-ready | **0** |
| billing-review | **61** |
| billing-deferred (W3) | **61** |

Details: [`wave2-billing-package.md`](wave2-billing-package.md).

---

## 6. Part 5–6 — Staging & rollback

- [`wave2-staging-validation-plan.md`](wave2-staging-validation-plan.md)
- [`wave2-rollback-plan.md`](wave2-rollback-plan.md)

---

## 7. Part 7 — Production impact

| Metric | Before (prod today) | After Wave 2 (est.) |
|--------|------------------:|--------------------:|
| Active imaging studies | **80** | **141** |
| Net-new Wave 2 rows | — | **+61** |
| New aliases (est.) | — | **~65–85** |
| New classifier FK assignments (est.) | — | **~305–330** |
| Search footprint | Wave 1 baseline | +MSK + CTA extremity + US core smoke |

---

## 8. Part 8 — Implementation authorization

### 2E.6B staging implementation: **YES**

**Approved scope for 2E.6B (staging only):**

| Item | Scope |
|------|--------|
| Catalog seed | **61** rows — `XR-2` (53), `CT-2` (4), `US-1` (4) |
| Classifier FKs | At seed per workbook |
| Aliases | REQUIRED calcaneus (≥6 strings) + OPTIONAL authoring per alias package |
| US tuple pass | **15** protocols on existing codes (parallel) |
| Billing | Remain `PENDING_CPT_REVIEW`; no CPT assignment |
| Validation | Execute [`wave2-staging-validation-plan.md`](wave2-staging-validation-plan.md) |

**Explicitly not authorized in 2E.6B by this document alone:**

- Production seed / Railway apply
- Billing activation (W3)
- Phase **2D** retirement execution
- Search flag / ranking changes
- Wave 3–4 rows

### Blockers for production (future 2E.6x gate)

| ID | Blocker | Owner |
|----|---------|-------|
| P1 | Per-wave **clinical sign-off** (Gate W2) | Clinical |
| P2 | Staging **PASS** evidence package | Engineering + QA |
| P3 | US tuple **15/15** validated | Clinical + QA |
| P4 | Workbook `status` promotion from `WORKBOOK_DRAFT` | Product / clinical governance |

*None of P1–P4 block **staging** start (2E.6B).*

---

## 9. Part 9 — 2E.6B readiness

| Field | Value |
|-------|--------|
| **2E.6B readiness** | **READY** |
| **Blockers** | **None** for staging implementation |

**Rationale:** Workbook complete for `wave=2`; Wave 1 production stable (**SAFE**); governance and classifier dependencies satisfied; rollback and validation plans defined.

---

## 10. SAFE determination

| Environment | Verdict |
|-------------|---------|
| **Design / 2E.6A authorization package** | **SAFE** |
| **2E.6B staging implementation** | **SAFE** (authorized) |
| **Production apply** | **NOT SAFE** until staging PASS + clinical sign-off + production gate (future phase) |

---

## 11. Related documents

| Document | Role |
|----------|------|
| [`wave1-wave2-impact-assessment.md`](wave1-wave2-impact-assessment.md) | Non-blocking adoption backlog |
| [`enterprise-imaging-gate-w2.md`](enterprise-imaging-gate-w2.md) | Enterprise gate |
| [`wave1-governance-approval-record.md`](wave1-governance-approval-record.md) | W2.3 precedent |

---

*No implementation, seeds, migrations, or production writes in 2E.6A.*
