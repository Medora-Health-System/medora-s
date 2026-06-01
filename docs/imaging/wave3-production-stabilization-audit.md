# Wave 3 Production Stabilization & Adoption Audit (Phase 2E.7E)

**Phase:** 2E.7E — read-only production stabilization audit  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres, read-only validation)  
**Scope:** Post–Wave 3 production execution — **no writes**, **no seeds**, **no migrations**

**Inputs:** [`wave3-production-execution-report.md`](wave3-production-execution-report.md) · [`wave3-production-postflight-report.md`](wave3-production-postflight-report.md) · [`wave3-production-idempotency-report.md`](wave3-production-idempotency-report.md) · [`wave3-production-authorization.md`](wave3-production-authorization.md)  
**Seed commit:** `d080595d` · execution docs (operator-recorded)

**Companion deliverables:** [`wave3-search-adoption-audit.md`](wave3-search-adoption-audit.md) · [`wave3-wave4-impact-assessment.md`](wave3-wave4-impact-assessment.md)

---

## Executive summary

| Area | Result |
|------|--------|
| **Production inventory** | **PASS** |
| **Search adoption** | **PASS WITH OBSERVATIONS** |
| **Governance regression** | **PASS** |
| **Order entry readiness** | **READY WITH OBSERVATIONS** |
| **Wave 3 stabilization (2E.7E)** | **STABILIZED** |
| **Production safety** | **SAFE** |
| **Wave 4 authorization blockers** | **NO** |

Wave 3 production execution completed successfully. Operator-run `prisma:seed-catalogs` and `wave3-staging-validation.ts` on production reported **19/19** checks **PASS**, **182** active imaging studies, **41** Wave 3 rows, **86** Wave 3 aliases, and idempotent run 2 (**0** new aliases). Wave 1 (**37**) and Wave 2 (**61**) unchanged. Classifier FK completeness **41/41**. Two optional search phrases (`mra neck`, `ventilation perfusion`) do not resolve via substring match; mitigations documented. Four MRI anatomy phrases (shoulder / elbow / wrist / ankle) are **outside Wave 3 MRI-2 scope** (no matching catalog rows). Six pre-existing global duplicate alias groups remain; not introduced by Wave 3.

---

## Part 1 — Production inventory validation

**Evidence:** Production `wave3-staging-validation.ts` (2026-06-01, post–run 1); idempotency seed log (run 2); catalog-equivalent read-only inventory cross-check.

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging studies | **182** | **182** | **PASS** |
| Haiti baseline (active) | **43** | **43** | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 3 active | **41** | **41** | **PASS** |
| Wave 3 aliases | **86** | **86** | **PASS** |

### Wave 3 batch breakdown

| Batch | Expected active | Actual | Result |
|-------|----------------:|--------|--------|
| MRI-2 | **14** | **14** | **PASS** |
| MRA-1 | **5** | **5** | **PASS** |
| US-2 | **10** | **10** | **PASS** |
| US-3 | **3** | **3** | **PASS** |
| FL-1 | **4** | **4** | **PASS** |
| NM-1 | **5** | **5** | **PASS** |
| **Total** | **41** | **41** | **PASS** |

### Integrity checks

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Duplicate active `CatalogImagingStudy.code` | **0** | **0** | **PASS** |
| Wave 3 classifier FK completeness | **41/41** | **41/41** | **PASS** |
| Wave 3 internal duplicate aliases | **0** | **0** | **PASS** |
| Global duplicate alias groups (pre-existing) | Documented | **6** groups | **PASS WITH OBSERVATIONS** |

### Idempotency (run 2)

| Metric | Run 1 | Run 2 | Result |
|--------|-------|-------|--------|
| Wave 3 studies | **41** | **41** (stable) | **PASS** |
| Wave 3 aliases created | **86** | **0** | **PASS** |
| Active imaging | **182** | **182** | **PASS** |

**Part 1 verdict:** **PASS**

---

## Part 2 — Search adoption audit

Full matrix: [`wave3-search-adoption-audit.md`](wave3-search-adoption-audit.md).

| Scope | Result |
|-------|--------|
| Production validation smokes | **PASS** (6/6 in script) |
| Extended adoption matrix | **PASS WITH OBSERVATIONS** |

**Part 2 verdict:** **PASS WITH OBSERVATIONS**

---

## Part 3 — Governance regression audit

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `CT_HEAD` inactive | **false** | **false** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| Forbidden Wave 3 codes (`CT_HEAD`, `US_ABD`, `DOPPLER_VEIN`, etc.) | Not inserted | **PASS** | **PASS** |
| `DOPPLER_VEIN` / `US_ABD` / `CT_ABD` | Baseline only | **1** each | **PASS** |
| No `US_VENOUS_DOPPLER_LE_LEFT`/`_RIGHT` | **0** | **0** | **PASS** |
| Duplicate active codes | **0** | **0** | **PASS** |
| Wave 1 unchanged | **37** | **37** | **PASS** |
| Wave 2 unchanged | **61** | **61** | **PASS** |
| Retirement execution (Phase 2D) | Not run | Not run | **PASS** (N/A) |
| Successor violations | None | None | **PASS** |

**Part 3 verdict:** **PASS**

---

## Part 4 — Order entry readiness

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `displayNameEn` on all 41 Wave 3 rows | Present | **41/41** | **PASS** |
| `displayNameFr` on all 41 Wave 3 rows | Present | **41/41** | **PASS** |
| Classifier tuples (modality/body/contrast/laterality) | **41/41** | **41/41** | **PASS** |
| Protocol FK where specified | Per manifest | **20/20** | **PASS** |
| Alias discoverability (representative) | High | See search audit | **PASS WITH OBSERVATIONS** |
| Search discoverability (production smokes) | **PASS** | **6/6** | **PASS** |
| `billingCodeDefault` on Wave 3 | **0** (deferred) | **0** | **PASS** |

**Mitigations:** Use `mra carotid`, `vq scan`, `scintigraphie V/Q perfusion`, `mri pelvis` / `mri upper extremity` where colloquial phrases fail (see search audit).

**Part 4 verdict:** **READY WITH OBSERVATIONS**

---

## Part 5 — Wave 3 stabilization decision

| Decision | Rationale |
|----------|-----------|
| **STABILIZED** | Production inventory, governance, idempotency, and classifier completeness **PASS**. Search and order-entry observations are non-blocking with documented mitigations. No rollback required. |

---

## Part 6 — Wave 4 impact (summary)

Full assessment: [`wave3-wave4-impact-assessment.md`](wave3-wave4-impact-assessment.md).

| Metric | Value |
|--------|------:|
| Remaining core rows (XR-3 + CT-3) | **31** |
| Optional XR-3b | **+33** |
| Projected active after Wave 4 (core) | **213** |
| Projected active after Wave 4 + XR-3b | **246** |

---

## Part 7 — Program status

| Track | Status |
|-------|--------|
| Wave 1 | Production — stabilized |
| Wave 2 | Production — stabilized |
| Wave 3 | Production — **stabilized** (2E.7E) |
| Wave 4 planning | **Clear to proceed** (authorization package) |
| Enterprise expansion | **182 / 170** core path active (+ XR-3b optional) |

---

## Required return (2E.7E)

| Deliverable | Value |
|-------------|--------|
| Production inventory | **PASS** |
| Search adoption | **PASS WITH OBSERVATIONS** |
| Governance | **PASS** |
| Order-entry readiness | **READY WITH OBSERVATIONS** |
| Wave 3 stabilization | **STABILIZED** |
| Wave 4 readiness | **YES** (no blockers) |
| **SAFE / NOT SAFE** | **SAFE** |

---

*End of Wave 3 production stabilization audit (Phase 2E.7E).*
