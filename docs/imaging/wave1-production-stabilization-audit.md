# Wave 1 Production Stabilization & Adoption Audit (Phase 2E.5C)

**Phase:** 2E.5C — read-only production stabilization audit  
**Date:** 2026-05-31  
**Environment:** Railway **production** (Postgres via `DATABASE_PUBLIC_URL`, read-only)  
**Scope:** Post–2E.5B validation only — **no writes**, **no seeds**, **no migrations**

**Inputs:** [`wave1-production-execution-report.md`](wave1-production-execution-report.md) · [`wave1-production-postflight-report.md`](wave1-production-postflight-report.md) · [`wave1-production-idempotency-report.md`](wave1-production-idempotency-report.md) · [`wave1-production-authorization-final-v2.md`](wave1-production-authorization-final-v2.md)

**Companion deliverables:** [`wave1-search-adoption-audit.md`](wave1-search-adoption-audit.md) · [`wave1-wave2-impact-assessment.md`](wave1-wave2-impact-assessment.md)

---

## Executive summary

| Area | Result |
|------|--------|
| **Production inventory** | **PASS** |
| **Search adoption** | **PASS WITH OBSERVATIONS** (11/13 strict phrases; mitigations documented) |
| **Order entry readiness** | **PASS** |
| **Governance regression** | **PASS** |
| **Adoption readiness** | **READY WITH OBSERVATIONS** |
| **Wave 1 stabilization (2E.5C)** | **PASS** |
| **Production safety** | **SAFE** |
| **Wave 2 authorization recommendation** | **RECOMMEND WAVE 2 AUTHORIZATION** (planning + staged implementation per Gate W2; not production apply in this phase) |

Wave 1 production state matches 2E.5B postflight and idempotency reports. Catalog counts, classifier completeness, retirement invariants, and idempotent seed behavior are confirmed on live production. Two optional English search phrases do not match substring search tokens (`xray` vs `x-ray`; `with contrast` vs `with iv contrast`); clinically equivalent queries and aliases resolve correctly.

---

## Part 1 — Production inventory validation

Evidence: read-only SQL + `prisma/scripts/wave1-staging-validation.ts` against production (2026-05-31).

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging studies | **80** | **80** | **PASS** |
| Wave 1 studies (active) | **37** | **37** | **PASS** |
| Wave 1 aliases | **41** | **41** | **PASS** |
| `XR_CHEST` tuple aliases | **2** | **2** (`chest 1v decub`, `chest post intubation`) | **PASS** |

| Governance spot-check | Expected | Actual | Result |
|-----------------------|----------|--------|--------|
| `CT_HEAD` inactive | `isActive = false` | **false** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| Duplicate active imaging `code` rows | **0** | **0** | **PASS** |

**Part 1 verdict:** **PASS**

---

## Part 2 — Search adoption audit

Full matrix: [`wave1-search-adoption-audit.md`](wave1-search-adoption-audit.md).

Method: `ImagingCatalogService.search()` on production (default terminology flags: classifier search **off**, matching deployed API unless `TERMINOLOGY_SEARCH_CLASSIFIER=true`).

| Family | Representative queries tested | Strict pass rate |
|--------|--------------------------------|------------------|
| XR | ribs left/right, coccyx, sacrum, lumbar spine xray | 4/5 |
| CT | ct head with contrast, tdm tête avec contraste, ct pelvis, ct cervical spine | 3/4 |
| MRI | mri/irm cervical, lumbar, thoracic spine | 3/3 |

**Observations (non-blocking):**

| Query | Issue | Mitigation |
|-------|--------|------------|
| `lumbar spine xray` | Empty — `searchText` uses `x-ray`, not `xray` | `lumbar spine`, `lspine`, `lombaire` return all four `XR_LSPINE_*` Wave 1 codes |
| `ct head with contrast` | Empty — `searchText` uses `with iv contrast` | `CT Head w IV Contrast` (alias), `tdm tête avec`, `ct head` (WO + W contrast successors) |

**Part 2 verdict:** **PASS WITH OBSERVATIONS**

---

## Part 3 — Order entry readiness

All **37** Wave 1 codes validated on production:

| Criterion | Result |
|-----------|--------|
| `isActive = true` | **37/37** |
| Searchable (catalog `searchText` + aliases; smoke via `ImagingCatalogService`) | **37/37** (family-level smoke **PASS**; see Part 2 phrase notes) |
| Classifier FKs complete (modality, body, contrast, laterality + manifest view/subregion/protocol) | **37/37** |
| `displayNameEn` present | **37/37** |
| `displayNameFr` present | **37/37** |
| `billingCodeDefault` unset (deferred W3) | **0/37 set** — by design |

**Part 3 verdict:** **PASS**

---

## Part 4 — Governance regression audit

| Control | Expected | Actual | Result |
|---------|----------|--------|--------|
| **Retirement** `CT_HEAD` inactive | Yes | **inactive** | **PASS** |
| No `CT_HEAD` recreation | No new active `CT_HEAD` | **inactive only** | **PASS** |
| No `CT_CHEST_CTA` recreation by Wave 1 | Baseline predecessor unchanged | **1 row, active** (pre-2D policy) | **PASS** |
| **Duplicate prevention** `CT_ABD` | 1 row | **1** | **PASS** |
| `DOPPLER_VEIN` | 1 row | **1** | **PASS** |
| `US_ABD` | 1 row | **1** | **PASS** |
| Wave 1 forbidden codes inserted | 0 | **0** | **PASS** |
| **Contrast governance** `MRI_SPINE` | `contrastTypeClassifierId` NULL | **NULL** | **PASS** |
| `CT_HEAD` in active search for `ct head` | Excluded | **WO + W_CONTRAST only** | **PASS** |

**Pre-existing (accepted, not Wave 1 regression):** six global duplicate alias strings across inactive + active catalog rows (documented 2E.5B). Baseline predecessors `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` remain **active** until Phase **2D** retirement execution.

**Part 4 verdict:** **PASS**

---

## Part 5 — Adoption readiness

**Classification:** **READY WITH OBSERVATIONS**

| Rationale | Detail |
|-----------|--------|
| Catalog integrity | Counts, classifiers, FR/EN labels, and idempotency confirmed on production |
| Discoverability | Wave 1 families discoverable via aliases and `searchText`; two English phrase token gaps documented with workarounds |
| Clinical risk | No forbidden code expansion; `CT_HEAD` remains retired from active search; contrast null on `MRI_SPINE` preserved |
| Billing | All Wave 1 rows `PENDING_CPT_REVIEW` — order entry allowed; billing activation remains **W3** / out of scope |
| Training | Staff should prefer `lumbar spine` / `CT Head w IV Contrast` / `tdm tête avec` over failing literal phrases |

**Not blocking clinic use** for Wave 1 scope (XR-1, CT-1, MRI-1).

---

## Part 6 — Wave 2 impact assessment

See [`wave1-wave2-impact-assessment.md`](wave1-wave2-impact-assessment.md).

**Summary:** No Wave 1 stabilization finding blocks Wave 2 authorization planning. Optional alias/searchText tuning may be scheduled with Wave 2 alias authoring (XR-2 / CT-2 / US-1) — not a catalog or governance defect.

---

## Part 7 — Wave 2 authorization recommendation

**Recommendation:** **RECOMMEND WAVE 2 AUTHORIZATION**

| Factor | Assessment |
|--------|------------|
| Wave 1 production execution | **SUCCESS** (2E.5B) |
| Stabilization gates | Inventory, governance, order entry **PASS** |
| Idempotency | **PASS** (run 2: 0 new aliases) |
| Search | **PASS WITH OBSERVATIONS** — document training / optional alias backlog |
| Gate W2 | Remains **OPEN** for Waves 2–4; Wave 1 operational slice **closed** |

**Rationale:** Production catalog state is stable and aligned with signed Wave 1 manifest. Observations are discoverability polish, not data-integrity or governance failures. Wave 2 (**61** rows: XR-2, CT-2, US-1) may proceed under existing Gate W2 controls (staging → sign-off → production apply per wave), with **no** production seed in 2E.5C.

**Does not authorize:** Wave 2 production apply, billing activation, Phase 2D retirement, or search-flag changes.

---

## Part 8 — Program status

| Phase | Status |
|-------|--------|
| **Wave 1 Production** | **COMPLETE** |
| **Wave 1 Stabilization (2E.5C)** | **PASS** |
| **Wave 2 Planning** | **AUTHORIZED** (enterprise Gate W2; per-wave clinical sign-off still required before prod apply) |
| **Wave 2 Implementation** | **READY** (staging seed / validation next; not executed in 2E.5C) |

---

## Evidence log

| Artifact | Method |
|----------|--------|
| Inventory + governance + core search | `pnpm exec ts-node --transpile-only prisma/scripts/wave1-staging-validation.ts` via `railway run` (production Postgres, read-only) — **23/23 checks PASS** |
| Extended adoption search matrix | `ImagingCatalogService.search()` production inline audit — see search deliverable |
| Prior execution | 2E.5B execution, postflight, idempotency reports |

---

## Final disposition

| Field | Value |
|-------|--------|
| **2E.5C stabilization** | **PASS** |
| **Production safety** | **SAFE** |
| **Wave 2** | **RECOMMEND WAVE 2 AUTHORIZATION** |
| **Implementation in this phase** | **None** |

*Read-only audit. No production writes performed.*
