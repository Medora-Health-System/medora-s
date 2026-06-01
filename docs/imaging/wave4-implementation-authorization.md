# Wave 4 Implementation Authorization (Phase 2E.8A)

**Phase:** 2E.8A  
**Date:** 2026-06-01  
**Authority:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) — Wave 4 core batches (**31** rows)  
**Predecessor:** Wave 3 production **STABILIZED** · [`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md) **SAFE** · [`wave3-wave4-impact-assessment.md`](wave3-wave4-impact-assessment.md) **YES**

**Design authority:** 2E.2A (XR) · 2E.2B (CT/CTA) · 2E.3 roadmap · Gate W2 [`enterprise-imaging-gate-w2.md`](enterprise-imaging-gate-w2.md)

---

## 1. Return summary

| Metric | Value |
|--------|------:|
| **Wave 4 row count (core)** | **31** |
| **XR-3 / CT-3** | **7 / 24** |
| **XR-3b (optional, out of 2E.8A)** | **+33** |
| **Alias count (est.)** | **~45–70** strings |
| **Required alias codes (workbook)** | **0** |
| **Billing review count** | **31** |
| **Classifier completeness (required slots)** | **100%** (31/31) |
| **Projected active imaging (full Wave 4)** | **213** (182 + 31) |
| **Projected active (+ XR-3b)** | **246** (213 + 33) |
| **Gate W2 (enterprise)** | **OPEN** (process artifacts; not blocking staging) |
| **2E.8B staging implementation** | **YES** |
| **2E.8B readiness** | **YES** |
| **Staging authorization** | **YES** |
| **Production authorization** | **NOT YET** |
| **SAFE / NOT SAFE** | Design **SAFE** · Production apply **NOT SAFE** (staging only) |

---

## 2. Part 1 — Authoritative inventory

| Batch | Count |
|-------|------:|
| XR-3 | **7** |
| CT-3 | **24** |
| **Total** | **31** |

**Audits:** duplicate codes **0** · collision Waves 1–3/Haiti **0** · forbidden codes **0** · retirement **PASS** · successor **PASS**.

Full listing: [`wave4-implementation-inventory.md`](wave4-implementation-inventory.md).

---

## 3. Part 2 — Alias package

| Class | Count |
|-------|------:|
| REQUIRED (workbook) | **0** codes |
| OPTIONAL | **31** codes |
| NONE | **0** |
| Est. alias strings | **~45–70** |

Details: [`wave4-alias-package.md`](wave4-alias-package.md).

---

## 4. Part 3 — Classifier validation

| Slot | XR-3 | CT-3 | Complete |
|------|-----:|-----:|---------:|
| Modality | 7/7 | 24/24 | **31/31** |
| Body region | 7/7 | 24/24 | **31/31** |
| Contrast | 7/7 | 24/24 | **31/31** |
| Laterality | 7/7 | 24/24 | **31/31** |
| View count | 7/7 | N/A | **PASS** |
| Anatomic subregion | 7/7 | per workbook | **PASS** |
| Protocol | 0/0 | 1/1 | **1/1** |

| Metric | Value |
|--------|------:|
| **Classifier completeness %** (modality + body + contrast + laterality) | **100%** |
| **Missing ICM classifier dependencies** | **0** |
| **MRI_SPINE B1B regression** | Required at staging — contrast **NULL** |
| **CT_HEAD inactive** | Required at staging |

---

## 5. Part 4 — Billing package

| State | Count |
|-------|------:|
| billing-ready | **0** |
| billing-review (`PENDING_CPT_REVIEW`) | **31** |
| billing-deferred (Gate W3) | **31** |

Details: [`wave4-billing-package.md`](wave4-billing-package.md).

---

## 6. Part 5–6 — Staging & rollback

- [`wave4-staging-validation-plan.md`](wave4-staging-validation-plan.md)
- [`wave4-rollback-plan.md`](wave4-rollback-plan.md)

---

## 7. Part 7 — Production impact (projected)

| Metric | Before (prod today) | After Wave 4 (full, est.) |
|--------|--------------------:|--------------------------:|
| Active imaging studies | **182** | **213** |
| Net-new Wave 4 rows | — | **+31** |
| New aliases (est.) | — | **~45–70** |
| Search footprint | Wave 3 baseline | +shoulder girdle XR · advanced CT head/MSK |
| Optional XR-3b | — | **+33** → **246** active |

---

## 8. Part 8 — Staging authorization

### Can Wave 4 proceed to staging implementation?

## **YES**

**Rationale:**

1. Wave 3 production stabilized (**SAFE**, 182 active, idempotent seed, governance invariants hold).
2. All **31** workbook rows have complete classifier assignments and French `displayNameFr`.
3. ICM-1.0 vocabulary includes all referenced classifiers (`PROTOCOL_CT_BRAIN_PERFUSION`, shoulder subregions, etc.).
4. No catalog code collisions or forbidden-code violations in the manifest.
5. Staging does not require Gate W3 billing or production deploy.

**Conditions (non-blocking for 2E.8B staging):**

| ID | Condition |
|----|-----------|
| W4-A-01 | Sign Haiti **CT-3 pilot scope matrix** (full 24 vs head-only vs MSK-only) before production authorization (future 2E.8D). |
| W4-A-02 | Clinical sign-off on `CT_BRAIN_PERFUSION` if perfusion not performed in Haiti. |
| W4-A-03 | Author OPTIONAL aliases per [`wave4-alias-package.md`](wave4-alias-package.md) during 2E.8B (~45–70 strings). |
| W4-A-04 | XR-3b remains **out of scope** unless separate parity authorization is issued. |

---

## 9. Part 9 — Phase 2E.8B readiness

### May **2E.8B — Wave 4 Staging Catalog Implementation** begin immediately?

## **YES**

**Exact implementation scope (2E.8B):**

| Item | Scope |
|------|--------|
| Catalog seed module | **31** rows — `XR-3` (7), `CT-3` (24) |
| Classifier FKs | At seed per workbook / inventory |
| Aliases | OPTIONAL authoring (~45–70 strings); **0** workbook REQUIRED |
| US / MRI tuple pass | **None** |
| Billing | Remain `PENDING_CPT_REVIEW`; no CPT assignment |
| Validation | Implement + execute [`wave4-staging-validation-plan.md`](wave4-staging-validation-plan.md) |
| Pilot deferral | May implement full manifest with seed flags or split modules per signed matrix |
| Forbidden | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` |
| Regression | Preserve `MRI_SPINE` contrast **NULL**, `CT_HEAD` inactive, Waves 1–3 counts |

**Blockers for 2E.8B:** **None.**

**Out of scope for 2E.8B:** production deploy · billing activation · Phase 2D retirement · XR-3b (unless separately authorized) · search engine UX changes.

---

## 10. Verdict table

| Question | Answer |
|----------|--------|
| Wave 4 design authorization (2E.8A) | **AUTHORIZED** |
| Staging implementation (2E.8B) | **YES — begin** |
| Staging authorization | **YES** |
| Production implementation | **NOT AUTHORIZED** (requires future 2E.8C/D gate) |
| **SAFE / NOT SAFE** | **SAFE** (design + staging path) |

---

## 11. Required return (2E.8A)

| Deliverable | Value |
|-------------|--------|
| Wave 4 rows | **31** (XR-3 **7** + CT-3 **24**) |
| Projected active after Wave 4 | **213** |
| 2E.8B readiness | **YES** |
| Staging authorization | **YES** |
| Production authorization | **NOT YET** |
| **SAFE** | **YES** |

---

## 12. Companion deliverables

| Document | Purpose |
|----------|---------|
| [`wave4-implementation-inventory.md`](wave4-implementation-inventory.md) | Part 1 — 31-row register |
| [`wave4-alias-package.md`](wave4-alias-package.md) | Part 2 — alias classification |
| [`wave4-billing-package.md`](wave4-billing-package.md) | Part 4 — billing deferral |
| [`wave4-staging-validation-plan.md`](wave4-staging-validation-plan.md) | Part 5 — PASS/FAIL criteria |
| [`wave4-rollback-plan.md`](wave4-rollback-plan.md) | Part 6 — soft rollback |
| [`wave3-wave4-impact-assessment.md`](wave3-wave4-impact-assessment.md) | Wave 3 → 4 gate (2E.7E) |

---

*Audit and design only — no code, seeds, migrations, commits, or deployments in 2E.8A.*
