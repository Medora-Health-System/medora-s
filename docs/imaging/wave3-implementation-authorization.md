# Wave 3 Implementation Authorization (Phase 2E.7A)

**Phase:** 2E.7A  
**Date:** 2026-06-01  
**Authority:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) — Wave 3 batches (**41** rows)  
**Predecessor:** Wave 2 production **COMPLETE** · [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md) **PASS** · [`wave2-production-execution-report.md`](wave2-production-execution-report.md) **SUCCESS**

**Design authority:** 2E.2C (MRI/MRA) · 2E.2D (US) · 2E.2E (FL/NM) · 2E.3 roadmap · Gate W2 [`enterprise-imaging-gate-w2.md`](enterprise-imaging-gate-w2.md)

---

## 1. Return summary

| Metric | Value |
|--------|------:|
| **Wave 3 row count** | **41** |
| **MRI-2 / MRA-1 / US-2 / US-3 / FL-1 / NM-1** | **14 / 5 / 10 / 3 / 4 / 5** |
| **Alias count (est.)** | **~55–75** strings |
| **Required alias codes (workbook)** | **0** |
| **Billing review count** | **41** |
| **Classifier completeness (required slots)** | **100%** (41/41) |
| **Projected active imaging (full Wave 3)** | **182** (141 + 41) |
| **Gate W2 (enterprise)** | **OPEN** (process artifacts; not blocking staging) |
| **2E.7B staging implementation** | **YES** |
| **2E.7B readiness** | **READY** |
| **SAFE / NOT SAFE** | Design **SAFE** · Production apply **NOT SAFE** (staging only) |

---

## 2. Part 1 — Authoritative inventory

| Batch | Count |
|-------|------:|
| MRI-2 | 14 |
| MRA-1 | 5 |
| US-2 | 10 |
| US-3 | 3 |
| FL-1 | 4 |
| NM-1 | 5 |
| **Total** | **41** |

**Audits:** duplicate codes **0** · collision Wave 1/2/Haiti **0** · forbidden codes **0** · retirement **PASS** · US-2 `AVOID_DOPPLER_VEIN` **PASS**.

Full listing: [`wave3-implementation-inventory.md`](wave3-implementation-inventory.md).

---

## 3. Part 2 — Alias package

| Class | Count |
|-------|------:|
| REQUIRED (workbook) | **0** codes |
| OPTIONAL | **41** codes |
| NONE | **0** |
| Est. alias strings | **~55–75** |

Details: [`wave3-alias-package.md`](wave3-alias-package.md).

---

## 4. Part 3 — Classifier validation

| Slot | MRI-2 | MRA-1 | US-2 | US-3 | FL-1 | NM-1 | Complete |
|------|------:|------:|-----:|-----:|-----:|-----:|---------:|
| Modality | 14/14 | 5/5 | 10/10 | 3/3 | 4/4 | 5/5 | **41/41** |
| Body region | 14/14 | 5/5 | 10/10 | 3/3 | 4/4 | 5/5 | **41/41** |
| Contrast | 14/14 | 5/5 | 10/10 | 3/3 | 4/4 | 5/5 | **41/41** |
| Laterality | 14/14 | 5/5 | 10/10 | 3/3 | 4/4 | 5/5 | **41/41** |
| View count | N/A | N/A | N/A | N/A | N/A | N/A | **PASS** |
| Protocol (where specified) | 1/1 | 0/0 | 10/10 | 0/0 | 4/4 | 5/5 | **20/20** |
| Anatomic subregion | per workbook | per workbook | per workbook | 3/3 | 1/4 | per workbook | **PASS** |

| Metric | Value |
|--------|------:|
| **Classifier completeness %** (modality + body + contrast + laterality) | **100%** |
| **Missing ICM classifier dependencies** | **0** |
| **MRI_SPINE B1B regression** | Required at staging — contrast **NULL** |
| **New modalities in seed vocabulary** | `MODALITY_MRA`, `MODALITY_FL`, `MODALITY_NM` — all in [`imaging-classifier-manifest.md`](imaging-classifier-manifest.md) |

---

## 5. Part 4 — Billing package

| State | Count |
|-------|------:|
| billing-ready | **0** |
| billing-review | **41** |
| billing-deferred (Gate W3) | **41** |

Details: [`wave3-billing-package.md`](wave3-billing-package.md).

---

## 6. Part 5–6 — Staging & rollback

- [`wave3-staging-validation-plan.md`](wave3-staging-validation-plan.md)
- [`wave3-rollback-plan.md`](wave3-rollback-plan.md)

---

## 7. Part 7 — Production impact (projected)

| Metric | Before (prod today) | After Wave 3 (full, est.) |
|--------|--------------------:|--------------------------:|
| Active imaging studies | **141** | **182** |
| Net-new Wave 3 rows | — | **+41** |
| New aliases (est.) | — | **~55–75** |
| New classifier FK assignments (est.) | — | **~205–230** |
| Search footprint | Wave 2 baseline | +MSK MRI · MRA · vascular US · breast · FL · NM smokes |
| Pilot-minimum footprint | — | **+18** → **159** active |

---

## 8. Part 8 — Implementation authorization

### Can Wave 3 proceed to staging implementation?

## **YES**

**Rationale:**

1. Wave 2 production stabilized (**SAFE**, 141 active, idempotent seed, regression invariants hold).
2. All **41** workbook rows have complete classifier assignments and French `displayNameFr`.
3. ICM-1.0 vocabulary includes MRA/FL/NM modalities and all referenced protocols.
4. Governance blockers from 2E.2C–2E.2E are **design-time** only; staging does not require Gate W3 billing or production deploy.
5. No catalog code collisions or forbidden-code violations in the manifest.

**Conditions (non-blocking for 2E.7B staging):**

| ID | Condition |
|----|-----------|
| W3-A-01 | Sign Haiti **pilot scope matrix** (full 41 vs minimum 18 vs per-batch deferral) before production authorization (future 2E.7D). |
| W3-A-02 | Clinical sign-off on MRA/FL/NM inclusion if Haiti clinic does not perform in-house studies. |
| W3-A-03 | Author OPTIONAL aliases per [`wave3-alias-package.md`](wave3-alias-package.md) during 2E.7B (recommended ~55–75 strings). |
| W3-A-04 | Gate W2 open workbook/process items tracked; not required to close before staging seed. |

---

## 9. Part 9 — Phase 2E.7B readiness

### May **2E.7B — Wave 3 Staging Catalog Implementation** begin immediately?

## **YES**

**Exact implementation scope (2E.7B):**

| Item | Scope |
|------|--------|
| Catalog seed module | **41** rows — `MRI-2` (14), `MRA-1` (5), `US-2` (10), `US-3` (3), `FL-1` (4), `NM-1` (5) |
| Classifier FKs | At seed per workbook / inventory |
| Aliases | OPTIONAL authoring (~55–75 strings); **0** workbook REQUIRED |
| US tuple pass | **None** (Wave 3) |
| Billing | Remain `PENDING_CPT_REVIEW`; no CPT assignment |
| Validation | Implement + execute [`wave3-staging-validation-plan.md`](wave3-staging-validation-plan.md) |
| Pilot deferral | May implement full manifest with seed flags or split modules per signed matrix |
| Forbidden | No `DOPPLER_VEIN`, `US_ABD`, `CT_ABD`, `CT_HEAD` expansion, `CT_CHEST_CTA` recreation |
| Regression | Preserve `MRI_SPINE` contrast **NULL**, `CT_HEAD` inactive, Wave 1 **37**, Wave 2 **61** |

**Blockers for 2E.7B:** **None.**

**Out of scope for 2E.7B:** production deploy · billing activation · Phase 2D retirement execution · search engine UX changes.

---

## 10. Verdict table

| Question | Answer |
|----------|--------|
| Wave 3 design authorization (2E.7A) | **AUTHORIZED** |
| Staging implementation (2E.7B) | **YES — begin** |
| Production implementation | **NOT AUTHORIZED** (requires future 2E.7C/D gate) |
| **SAFE / NOT SAFE** | **SAFE** (design + staging path) |

---

## 11. Companion deliverables

| Document | Purpose |
|----------|---------|
| [`wave3-implementation-inventory.md`](wave3-implementation-inventory.md) | Part 1 — 41-row register |
| [`wave3-alias-package.md`](wave3-alias-package.md) | Part 2 — alias classification |
| [`wave3-billing-package.md`](wave3-billing-package.md) | Part 4 — billing deferral |
| [`wave3-staging-validation-plan.md`](wave3-staging-validation-plan.md) | Part 5 — PASS/FAIL criteria |
| [`wave3-rollback-plan.md`](wave3-rollback-plan.md) | Part 6 — soft rollback |
| [`wave2-wave3-impact-assessment.md`](wave2-wave3-impact-assessment.md) | Wave 2 → 3 gate (2E.6E) |

---

*Audit and design only — no code, seeds, migrations, commits, or deployments in 2E.7A.*
