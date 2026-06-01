# Wave 1 Staging Validation Plan (Phase W2.2 — Final)

**Phase:** W2.2 — design only  
**Date:** 2026-06-01  
**Baseline:** 44 catalog codes (W1) → **81** after Wave 1 (`wave=1` count **37**)  

---

## 1. Validation domains

### 1.1 Catalog validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Rows with `wave=1` codes | **37** | Exact match to workbook |
| Active Wave 1 rows | **37** | `isActive=true` |
| Duplicate `code` | **0** | Preflight query |
| Forbidden inserts | **0** | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` |

### 1.2 Alias validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| `XR_SACRUM_COCCYX_2V` aliases | ≥3 strings | Search resolves |
| No alias to retired codes | — | Audit |
| `XR_CHEST` tuple aliases | 2 protocols | Decub + post-intubation |

### 1.3 Classifier validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Modality / body / contrast / laterality | 37/37 set | FK not null |
| XR view count | 19/19 set | `viewCountClassifierId` |
| `MRI_SPINE` unchanged | contrast FK **null** | B1B regression |
| `CT_HEAD` unchanged | inactive | No reactivation |
| Dry-run idempotent | 2nd run stable | 0 drift |

### 1.4 Search validation *(smoke — no schema change)*

| Test | Pass criteria |
|------|---------------|
| FR search “sacrum” / “coccyx” | Finds `XR_SACRUM_COCCYX_2V` |
| FR “TDM tête contraste” | Finds `CT_HEAD_W_CONTRAST` |
| FR “IRM rachis cervical” | Finds `MRI_CSPINE_*` |

### 1.5 Retirement validation

| Test | Pass criteria |
|------|---------------|
| `CT_HEAD` not orderable | UI/API block |
| `CT_HEAD_WO_CONTRAST` orderable | yes |
| Predecessors unchanged until 2D | `CT_ABD`, etc. still per policy |

### 1.6 Billing validation

| Test | Pass criteria |
|------|---------------|
| All 37 `PENDING_CPT_REVIEW` | No priced CPT auto-applied |

---

## 2. Expected outcomes

| Outcome | When |
|---------|------|
| **PASS** | All §1.1–1.5 pass; §1.6 confirms deferred billing |
| **FAIL** | Any duplicate code; `MRI_SPINE` contrast set; `CT_HEAD` active; classifier missing |
| **CONDITIONAL PASS** | REQUIRED aliases + tuple pass done; OPTIONAL aliases incomplete |

---

## 3. Evidence required (2E.4A)

| Artifact | Owner |
|----------|-------|
| Preflight count output | Engineering |
| Classifier backfill log | Engineering |
| Signed smoke checklist | QA + Clinical |

---

*No staging execution in W2.2.*
