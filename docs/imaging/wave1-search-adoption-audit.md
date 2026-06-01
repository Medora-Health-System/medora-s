# Wave 1 Search Adoption Audit (Phase 2E.5C)

**Phase:** 2E.5C — Part 2 deliverable  
**Date:** 2026-05-31  
**Environment:** Railway production (read-only)  
**Search implementation:** `apps/api/src/order-catalog/imaging-catalog.service.ts`  
**Flags (production default):** `TERMINOLOGY_READ_CLASSIFIER` / `TERMINOLOGY_SEARCH_CLASSIFIER` **off** unless explicitly set on API service

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Queries tested** | **13** (representative Wave 1 families) |
| **Strict PASS** | **11** |
| **Strict FAIL** | **2** (mitigated by alternate phrases) |
| **Part 2 verdict** | **PASS WITH OBSERVATIONS** |

Staging-validation smoke (6 queries) on same production DB: **6/6 PASS** (includes `sacrum`, `coccyx and sacrum`, `tdm tête avec`, `irm rachis cervical`, `ct head`, `thorax`).

---

## 2. Test matrix

Legend:

- **Path `alias`:** `ImagingStudyAlias` substring match drove inclusion  
- **Path `catalog`:** `searchText`, `displayName*`, `code`, `name`, `modality`, or `bodyRegion` field match  
- **Path `rank`:** Multiple catalog matches; expected Wave 1 code present in top results  

| # | Family | Query | Expected (any of) | Actual (top results) | Matched code | Path | Result |
|---|--------|-------|-------------------|----------------------|--------------|------|--------|
| 1 | XR | `ribs left` | `XR_RIBS_LEFT` | `XR_RIBS_LEFT`, `XR_RIBS_LEFT_WITH_CXR` | `XR_RIBS_LEFT` | alias (`ribs left`) | **PASS** |
| 2 | XR | `ribs right` | `XR_RIBS_RIGHT` | `XR_RIBS_RIGHT`, `XR_RIBS_RIGHT_WITH_CXR` | `XR_RIBS_RIGHT` | alias (`ribs right`) | **PASS** |
| 3 | XR | `coccyx` | `XR_SACRUM_COCCYX_2V` | `XR_SACRUM_COCCYX_2V` | `XR_SACRUM_COCCYX_2V` | alias (`coccyx and sacrum`, etc.) | **PASS** |
| 4 | XR | `sacrum` | `XR_SACRUM_COCCYX_2V` | `XR_SACRUM_COCCYX_2V` | `XR_SACRUM_COCCYX_2V` | alias | **PASS** |
| 5 | XR | `lumbar spine xray` | `XR_LSPINE_*` (4 codes) | *(empty)* | — | none | **FAIL** |
| 6 | CT | `ct head with contrast` | `CT_HEAD_W_CONTRAST` | *(empty)* | — | none | **FAIL** |
| 7 | CT | `tdm tête avec contraste` | `CT_HEAD_W_CONTRAST` | `CT_HEAD_W_CONTRAST` | `CT_HEAD_W_CONTRAST` | catalog (`searchText`) | **PASS** |
| 8 | CT | `ct pelvis` | `CT_PELVIS_WO_*`, `CT_PELVIS_W_WO_*` | both pelvis Wave 1 codes | `CT_PELVIS_WO_CONTRAST` | alias (`ct pelvis wo iv contrast`) | **PASS** |
| 9 | CT | `ct cervical spine` | `CT_CERVICAL_SPINE` | `CT_CERVICAL_SPINE` | `CT_CERVICAL_SPINE` | catalog (baseline, not Wave 1) | **PASS** |
| 10 | MRI | `mri cervical spine` | `MRI_CSPINE_*` (3) | all three CSPINE Wave 1 codes | `MRI_CSPINE_WO_CONTRAST` | catalog / rank | **PASS** |
| 11 | MRI | `irm rachis cervical` | `MRI_CSPINE_*` (3) | all three | `MRI_CSPINE_WO_CONTRAST` | catalog (`searchText` FR) | **PASS** |
| 12 | MRI | `mri lumbar spine` | `MRI_LSPINE_*` (3) | all three | `MRI_LSPINE_WO_CONTRAST` | catalog / rank | **PASS** |
| 13 | MRI | `mri thoracic spine` | `MRI_TSPINE_*` (3) | all three | `MRI_TSPINE_WO_CONTRAST` | catalog / rank | **PASS** |

---

## 3. Failed-query analysis

### 3.1 `lumbar spine xray`

| Item | Detail |
|------|--------|
| **Root cause** | Substring search: Wave 1 `searchText` uses `lumbar spine x-ray` (hyphenated), not `xray` |
| **Expected clinically** | Any `XR_LSPINE_2V`, `XR_LSPINE_3V`, `XR_LSPINE_2V_UPRIGHT`, `XR_LSPINE_3V_UPRIGHT` |
| **Mitigation (verified)** | `lumbar spine` → all four XR lumbar codes + related CT/MRI; `lspine` → XR + MRI lumbar; `lombaire` → XR lumbar set |

### 3.2 `ct head with contrast`

| Item | Detail |
|------|--------|
| **Root cause** | `searchText` token is `ct head with iv contrast`; query `ct head with contrast` is not a contiguous substring |
| **Mitigation (verified)** | `CT Head w IV Contrast` (alias) → `CT_HEAD_W_CONTRAST`; `tdm tête avec` / `tdm tête avec contraste` → `CT_HEAD_W_CONTRAST`; `ct head` → `CT_HEAD_WO_CONTRAST` + `CT_HEAD_W_CONTRAST` (inactive `CT_HEAD` excluded) |

**Classifier path:** With default flags, classifier label search was **not** used for these tests. MRI FR queries succeeded via `displayNameFr` / `searchText`, not classifier expansion.

---

## 4. Supplemental phrases (operational)

| Query | Top codes | Notes |
|-------|-----------|--------|
| `lumbar spine` | `XR_LSPINE_*`, `MRI_LSPINE_*`, `CT_SPINE_LUMBAR`, … | Preferred XR discovery phrase |
| `lspine` | XR + MRI lumbar Wave 1 | Short token |
| `lombaire` | XR + MRI lumbar + `CT_SPINE_LUMBAR` | FR-friendly |
| `CT Head w IV Contrast` | `CT_HEAD_W_CONTRAST` | Exact alias |
| `ct head` | `CT_HEAD_WO_CONTRAST`, `CT_HEAD_W_CONTRAST` | No retired `CT_HEAD` |
| `radiographie lombaire` | *(empty)* | **Observation** — FR phrase not in `searchText`; use `lombaire` or `rachis lombaire` tokens from manifest |

---

## 5. Retirement / safety search checks

| Query | Expected | Actual | Result |
|-------|----------|--------|--------|
| `ct head` | Successors only; no active `CT_HEAD` | `CT_HEAD_WO_CONTRAST`, `CT_HEAD_W_CONTRAST` | **PASS** |
| `tdm tête avec` | `CT_HEAD_W_CONTRAST` | `CT_HEAD_W_CONTRAST` | **PASS** |

---

## 6. Verdict

| Field | Value |
|-------|--------|
| **Search adoption (Wave 1)** | **PASS WITH OBSERVATIONS** |
| **Blocking Wave 2** | **No** |
| **Recommended follow-up** | Optional alias tokens (`lumbar spine xray`, `ct head with contrast`, `radiographie lombaire`) in Wave 2 alias package — see [`wave1-wave2-impact-assessment.md`](wave1-wave2-impact-assessment.md) |

*No search code or catalog mutations in 2E.5C.*
