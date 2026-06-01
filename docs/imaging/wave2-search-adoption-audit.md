# Wave 2 Search Adoption Audit (Phase 2E.6E)

**Phase:** 2E.6E — read-only search discoverability audit  
**Date:** 2026-06-01  
**Scope:** Wave 2 families **XR-2**, **CT-2**, **US-1** + French equivalents  
**Method:** `ImagingCatalogService.search()` — default classifier terminology flags (**off**), matching deployed API unless `TERMINOLOGY_SEARCH_CLASSIFIER=true`

**Parent:** [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md)

---

## 1. Summary

| Result | Detail |
|--------|--------|
| **Overall** | **PASS WITH OBSERVATIONS** |
| Production validation smokes | **4/4 PASS** |
| Extended adoption matrix | **17/18 PASS** |
| Blocking failures | **None** |

---

## 2. Production validation smokes (authoritative)

Executed on **production** immediately after Wave 2 seed run 1 via `prisma/scripts/wave2-staging-validation.ts` (2026-06-01).

| Query | Expected code(s) | Top result(s) | Result |
|-------|------------------|---------------|--------|
| `os calcis left` | `XR_CALCANEUS_LEFT_2V` | `XR_CALCANEUS_LEFT_2V` | **PASS** |
| `ankle left` | `XR_ANKLE_LEFT_2V` (+ 3V sibling) | `XR_ANKLE_LEFT_2V`, `XR_ANKLE_LEFT_3V` | **PASS** |
| `cta lower extremity left` | `CTA_LOWER_EXTREMITY_LEFT` | `CTA_LOWER_EXTREMITY_LEFT` | **PASS** |
| `thyroid ultrasound` | `US_THYROID` | `US_THYROID` | **PASS** |
| `ct head` (regression) | Must **not** return `CT_HEAD` | `CT_HEAD_WO_CONTRAST`, `CT_HEAD_W_CONTRAST` | **PASS** |

---

## 3. Extended adoption matrix

**Evidence:** Read-only `ImagingCatalogService.search()` against catalog at commit **`52564a41`** / post-production state (same seed manifest as production). Extended phrases supplement production smokes; behavior is deterministic for identical catalog rows.

### XR-2

| Query | Family | Expected hit(s) | Pass | Notes |
|-------|--------|-----------------|------|-------|
| `os calcis left` | XR-2 | `XR_CALCANEUS_LEFT_2V` | **YES** | Production-confirmed |
| `os calcis right` | XR-2 | `XR_CALCANEUS_RIGHT_2V` | **YES** | |
| `heel xray` | XR-2 | Calcaneus L/R | **NO** | No alias/token `heel` in catalog; use mitigations below |
| `calcaneus` | XR-2 | `XR_CALCANEUS_LEFT_2V`, `XR_CALCANEUS_RIGHT_2V` | **YES** | |
| `ankle left` | XR-2 | `XR_ANKLE_LEFT_2V`, `XR_ANKLE_LEFT_3V` | **YES** | Production-confirmed |
| `ankle right` | XR-2 | `XR_ANKLE_RIGHT_2V`, `XR_ANKLE_RIGHT_3V` | **YES** | |
| `calcanéus gauche` | XR-2 | `XR_CALCANEUS_LEFT_2V` | **YES** | French display / alias path |

### CT-2

| Query | Family | Expected hit(s) | Pass | Notes |
|-------|--------|-----------------|------|-------|
| `cta lower extremity left` | CT-2 | `CTA_LOWER_EXTREMITY_LEFT` | **YES** | Production-confirmed |
| `cta lower extremity right` | CT-2 | `CTA_LOWER_EXTREMITY_RIGHT` | **YES** | |
| `angioscanner membre inférieur gauche` | CT-2 | `CTA_LOWER_EXTREMITY_LEFT` | **YES** | French |

### US-1

| Query | Family | Expected hit(s) | Pass | Notes |
|-------|--------|-----------------|------|-------|
| `thyroid ultrasound` | US-1 | `US_THYROID` | **YES** | Production-confirmed |
| `aorta ultrasound` | US-1 | `US_AORTA` | **YES** | |
| `bladder ultrasound` | US-1 | `US_BLADDER` | **YES** | |
| `chest ultrasound` | US-1 | `US_CHEST` | **YES** | |
| `échographie thyroïde` | US-1 | `US_THYROID` | **YES** | |
| `échographie aorte` | US-1 | `US_AORTA` | **YES** | |
| `échographie vessie` | US-1 | `US_BLADDER` | **YES** | |
| `échographie thorax` | US-1 | `US_CHEST` | **YES** | |

**Extended strict pass rate:** **17 / 18** (94%)

---

## 4. Observations (non-blocking)

### OBS-W2-S-01 — `heel xray` returns empty

| Field | Value |
|-------|--------|
| **Severity** | Low |
| **Impact** | Optional colloquial English phrase only |
| **Root cause** | Substring search has no `heel` token in `displayNameEn`, `displayNameFr`, or Wave 2 aliases |
| **Mitigations** | `calcaneus`, `os calcis left/right`, `calcanéus gauche/droit`, or browse XR foot/ankle family |
| **2E.6E action** | None (audit-only; alias add would be a future scoped change) |

### OBS-W2-S-02 — Global duplicate alias groups (pre-existing)

Six alias strings resolve to **two** active study codes (Haiti + Wave 1 overlap). Unchanged from Wave 1 stabilization audit. Not introduced by Wave 2. Clinicians may see sibling rows in rare searches (`ct abdomen`, `echo abdomen`, etc.).

### OBS-W2-S-03 — Wave 1 search nuance (carry-forward)

Phrases such as `lumbar spine xray` or `ct head with contrast` may still fail strict substring match while shorter tokens or aliases work (documented in 2E.5C). Does not affect Wave 2 families.

---

## 5. Family coverage

| Family | Queries tested | Pass | Fail |
|--------|---------------:|-----:|-----:|
| XR-2 | 7 | 6 | 1 (`heel xray`) |
| CT-2 | 3 | 3 | 0 |
| US-1 | 8 | 8 | 0 |
| **Total** | **18** | **17** | **1** |

---

## 6. Verdict

| Criterion | Result |
|-----------|--------|
| Wave 2 clinically representative discovery | **PASS** |
| French order-entry phrases (US + CTA + calcaneus) | **PASS** |
| Production smoke suite | **PASS** |
| **Search adoption (2E.6E)** | **PASS WITH OBSERVATIONS** |

---

*End of Wave 2 search adoption audit (Phase 2E.6E).*
