# Wave 2 Production Stabilization & Adoption Audit (Phase 2E.6E)

**Phase:** 2E.6E — read-only production stabilization audit  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres, read-only validation)  
**Scope:** Post–2E.6D execution only — **no writes**, **no seeds**, **no migrations**, **no commits**

**Inputs:** [`wave2-production-execution-report.md`](wave2-production-execution-report.md) · [`wave2-production-postflight-report.md`](wave2-production-postflight-report.md) · [`wave2-production-idempotency-report.md`](wave2-production-idempotency-report.md) · [`wave2-production-authorization-final.md`](wave2-production-authorization-final.md) · [`wave2-production-preflight-evidence.md`](wave2-production-preflight-evidence.md)  
**Execution commit:** `9584c75d` (seed implementation `52564a41`)

**Companion deliverables:** [`wave2-search-adoption-audit.md`](wave2-search-adoption-audit.md) · [`wave2-wave3-impact-assessment.md`](wave2-wave3-impact-assessment.md)

---

## Executive summary

| Area | Result |
|------|--------|
| **Production inventory** | **PASS** |
| **Search adoption** | **PASS WITH OBSERVATIONS** (17/18 extended phrases; 4/4 production smokes) |
| **Tuple governance** | **PASS** |
| **Order entry readiness** | **READY WITH OBSERVATIONS** |
| **Governance regression** | **PASS** |
| **Wave 2 stabilization (2E.6E)** | **PASS** |
| **Production safety** | **SAFE** |
| **Wave 3 planning blockers** | **NO** |

Wave 2 production execution completed successfully on 2026-06-01. Operator-run `prisma:seed-catalogs` (run 1) and `wave2-staging-validation.ts` against production reported **17/17** checks **PASS**, **141** active imaging studies, **61** Wave 2 rows, **85** Wave 2 aliases, and idempotent run 2 (**0** new aliases / **0** protocol updates). Catalog inventory, classifier FK completeness, retirement invariants, and forbidden-code boundaries match authorization. One optional English phrase (`heel xray`) does not resolve via substring search; clinically equivalent queries (`calcaneus`, `os calcis left/right`, `calcanéus gauche`) pass. Six **pre-existing** global duplicate alias groups (Wave 1 / Haiti baseline) remain documented; not introduced by Wave 2.

---

## Part 1 — Production inventory validation

**Evidence:** Operator production run — `wave2-staging-validation.ts` (2026-06-01, post–run 1); idempotency seed log (run 2).

### Counts

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging studies | **141** | **141** | **PASS** |
| Original Haiti catalog (active baseline rows) | **43** | **43** (141 − 37 − 61) | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 2 aliases | **≥ 85** | **85** | **PASS** |

### Wave 2 batch breakdown

| Batch | Expected active | Actual | Result |
|-------|----------------:|--------|--------|
| XR-2 | **53** | **53** | **PASS** |
| CT-2 | **4** | **4** | **PASS** |
| US-1 | **4** | **4** | **PASS** |
| **Total** | **61** | **61** | **PASS** |

### Integrity checks

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Duplicate active `CatalogImagingStudy.code` | **0** | **0** | **PASS** |
| Wave 2 classifier FK completeness | **61/61** | **61/61** | **PASS** |
| Wave 2 internal duplicate aliases | **0** | **0** (per validation manifest) | **PASS** |
| Global duplicate aliases (active catalog) | Pre-existing only | **6** groups (baseline; see search audit) | **PASS WITH OBSERVATIONS** |

**Global duplicate alias groups (unchanged from Wave 1 era):** `asp`, `ct abdomen`, `ct angio chest`, `echo abdomen`, `pe protocol`, `us duplex limited abdomen/pelvis/scrotal` — each maps to **2** distinct active study codes by design (predecessor/sibling overlap), not Wave 2 regressions.

### Idempotency (run 2)

| Metric | Run 1 | Run 2 | Result |
|--------|-------|-------|--------|
| Wave 2 studies upserted | 61 | 61 (stable) | **PASS** |
| Wave 2 aliases created | 85 | **0** | **PASS** |
| US tuple mappings | 15 | 15 (re-applied, stable) | **PASS** |
| Tuple aliases created | 31 | **0** | **PASS** |
| Tuple protocol updates | 2 | **0** | **PASS** |

**Part 1 verdict:** **PASS**

---

## Part 2 — Search adoption audit

Full matrix: [`wave2-search-adoption-audit.md`](wave2-search-adoption-audit.md).

| Scope | Result |
|-------|--------|
| Production smoke (validation script) | **PASS** (4/4) |
| Extended adoption matrix | **PASS WITH OBSERVATIONS** (17/18) |

**Part 2 verdict:** **PASS WITH OBSERVATIONS**

---

## Part 3 — Tuple governance audit

**Evidence:** Production validation + seed run 1 log.

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| US tuple mappings | **15** | **15** | **PASS** |
| Tuple aliases (run 1) | **31** | **31** | **PASS** |
| Tuple protocol FK updates | **2** | **2** (`US_ABDOMEN` → `PROTOCOL_US_ABDOMEN_LIMITED`; `US_SOFT` → `PROTOCOL_US_NECK_THYROID`) | **PASS** |
| Conflicting protocol on alias-only targets | None | Pelvis / OB / scrotum: alias-only (no second protocol FK) | **PASS** |
| `US_ABD` Wave 2 recreation | **Forbidden** | **Not created** — baseline `US_ABDOMEN` tuple pass only | **PASS** |
| Duplicate protocol assignment per code | **0** | **0** | **PASS** |
| Retirement / successor conflicts from tuple pass | None | Baseline codes remain active; no 2D retirement executed | **PASS** |

**Part 3 verdict:** **PASS**

---

## Part 4 — Order entry readiness

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `displayNameEn` on all 61 Wave 2 rows | Present | **61/61** | **PASS** |
| `displayNameFr` on all 61 Wave 2 rows | Present | **61/61** | **PASS** |
| Classifier FK completeness | **61/61** | **61/61** | **PASS** |
| XR-2 view count FKs | **53/53** | **53/53** | **PASS** |
| Alias discoverability (representative) | High | See search audit | **PASS WITH OBSERVATIONS** |
| `billingCodeDefault` on Wave 2 rows | **0** (deferred) | **0** | **PASS** (per Gate W2 scope) |

**Mitigations for observations:** Use `calcaneus`, `os calcis`, or French `calcanéus` instead of `heel xray`; document in staff quick-reference if needed (no catalog change in 2E.6E).

**Part 4 verdict:** **READY WITH OBSERVATIONS**

---

## Part 5 — Regression audit

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `CT_HEAD` inactive | `isActive = false` | **false** | **PASS** |
| `CT_HEAD` excluded from active search | Not returned for `ct head` | Returns Wave 1 successors only (`CT_HEAD_WO_CONTRAST`, `CT_HEAD_W_CONTRAST`) | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| `CT_ABD` duplication | Single baseline row | **1** row (no new duplicate) | **PASS** |
| `DOPPLER_VEIN` recreation | No new duplicate | **1** baseline row | **PASS** |
| `US_ABD` recreation | Forbidden as Wave 2 code | **Not present**; `US_ABDOMEN` baseline only | **PASS** |
| `CT_CHEST_CTA` Wave 2 recreation | Forbidden | Baseline row **unchanged** (not a Wave 2 insert) | **PASS** |
| Wave 2 forbidden codes in manifest | **0** | **0** | **PASS** |
| Wave 1 row count | **37** active | **37** | **PASS** |

**Part 5 verdict:** **PASS**

---

## Part 6 — Wave 3 impact (summary)

Full assessment: [`wave2-wave3-impact-assessment.md`](wave2-wave3-impact-assessment.md).

| Question | Answer |
|----------|--------|
| Wave 2 issues blocking Wave 3? | **NO** |
| Rationale | Inventory stable; classifiers complete; idempotent seed; regression invariants hold; search gaps are non-blocking observations |

---

## Part 7 — Program status

| Track | Status |
|-------|--------|
| **Wave 1** | **Production — stabilized** (2E.5B / 2E.5C) |
| **Wave 2** | **Production — executed & stabilized** (2E.6D / 2E.6E) |
| **Gate W2** | **OPEN** — Wave 2 production milestone complete; Waves 3–4 and workbook artifacts remain per [`enterprise-imaging-gate-w2.md`](enterprise-imaging-gate-w2.md) |
| **Wave 3 planning** | **Authorized to proceed** (design / staging; not production apply in 2E.6E) |
| **Enterprise imaging expansion** | **On track** — 141/170 active core path (+ XR-3b deferred); next tranche **Wave 3** (41 rows: MRI-2, MRA-1, US-2, US-3, FL-1, NM-1) |

---

## Required return (2E.6E)

| Deliverable | Value |
|-------------|--------|
| Production inventory counts | **141** active · **43** Haiti · **37** W1 · **61** W2 · **85** W2 aliases |
| Search adoption | **PASS WITH OBSERVATIONS** |
| Tuple governance | **PASS** |
| Order-entry readiness | **READY WITH OBSERVATIONS** |
| Regression audit | **PASS** |
| Wave 3 readiness | **NO** blockers |
| **SAFE / NOT SAFE** | **SAFE** |

---

## Audit constraints (observed)

- Read-only — no code, seeds, migrations, commits, deployments, catalog inserts, billing changes, search engine changes, or retirement execution.
- Repo copies of 2E.6D execution reports may still show agent **PENDING** text; **this audit supersedes** with operator production evidence (2026-06-01).

---

*End of Wave 2 production stabilization audit (Phase 2E.6E).*
