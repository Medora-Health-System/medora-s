# Wave 3 Staging Validation Plan (Phase 2E.7A)

**Phase:** 2E.7A — design only  
**Date:** 2026-06-01  
**Baseline:** **141** active imaging (production) → **182** after full Wave 3 seed on staging (`141 + 41`)  
**Pilot minimum:** **159** active if MRA/US-3/FL/NM deferred per signed matrix (`141 + 18`)

---

## 1. Validation domains

### 1.1 Catalog validation

| Test | Expected (full) | Pass criteria |
|------|-----------------|---------------|
| Wave 3 manifest rows | **41** | Exact match to workbook |
| Active Wave 3 rows after seed | **41** (or pilot subset) | `isActive=true` |
| Total active imaging | **182** (full) | 141 + 41 |
| Batch counts | MRI-2 **14** · MRA-1 **5** · US-2 **10** · US-3 **3** · FL-1 **4** · NM-1 **5** | Per batch |
| Duplicate `code` (global) | **0** new | Preflight query |
| Forbidden inserts | **0** | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` |
| Wave 1 / Wave 2 unchanged | **37** + **61** active | Count + spot FK |
| Haiti 44 unchanged | **43** active (+ inactive `CT_HEAD`) | Count policy |

**FAIL examples:** active count ≠ 182; any Wave 3 code missing; forbidden code created; Wave 2 count drops below 61.

---

### 1.2 Alias validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Wave 3 alias rows created | ~55–75 (est.) | Within plan or documented delta |
| Workbook REQUIRED aliases | **0** codes | N/A unless promoted |
| No alias to retired codes | — | Audit query |
| No new global duplicate alias conflicts | **0** new vs pre-seed | Compare baseline |
| US-2 aliases must not point at `DOPPLER_VEIN` | — | Code absent |

**FAIL examples:** alias on `CT_HEAD`; new global duplicate mapping two unrelated codes.

---

### 1.3 Classifier validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Modality / body / contrast / laterality | **41/41** set | FK not null |
| View count (MRI/MRA/US/FL/NM) | null FK | NOT_APPLICABLE |
| Protocol where workbook specifies | **20/20** set | See inventory |
| Optional anatomic subregion | per workbook | Null only where allowed |
| `MRI_SPINE` unchanged | contrast FK **null** | B1B regression |
| `CT_HEAD` unchanged | inactive | No reactivation |
| `MRI_BRAIN` unchanged | contrast WITHOUT | No overwrite from MRI-2 |
| Seed idempotent | 2nd run | 0 new rows; 0 new aliases |

**FAIL examples:** any required FK null; `MRI_SPINE` contrast set; `CT_HEAD` active.

---

### 1.4 Search validation (smoke)

| Query | Expected hit (any) | Family |
|-------|-------------------|--------|
| `mri knee left` / `IRM genou gauche` | `MRI_KNEE_LEFT` | MRI-2 |
| `mri pelvis` | `MRI_PELVIS` or `MRI_PELVIS_LIMITED` | MRI-2 |
| `mra carotid` / `ARM carotides` | `MRA_CAROTID_*` | MRA-1 |
| `carotid duplex` | `US_CAROTID_DUPLEX` | US-2 |
| `doppler artériel membre inférieur` | `US_ARTERIAL_DOPPLER_LE_*` | US-2 |
| `échographie mammaire` | `US_BREAST_*` | US-3 |
| `hida` / `scintigraphie HIDA` | `NM_HIDA` | NM-1 |
| `vq scan` | `NM_VQ_*` | NM-1 |
| `œsophagogramme` | `FL_ESOPHAGRAM` | FL-1 |
| `ct head` | no `CT_HEAD` | Regression |

**FAIL examples:** empty results for all rows above when aliases authored; `CT_HEAD` in results.

---

### 1.5 MRA validation

| Test | Pass criteria |
|------|---------------|
| `MODALITY_MRA` filter returns **5** active codes | After full seed |
| Distinct from `MODALITY_MRI` brain rows | No modality mis-tag |
| Carotid contrast split | `MRA_CAROTID_WO_CONTRAST` vs `MRA_CAROTID_W_CONTRAST` both active |
| LE MRA distinct from `CTA_LOWER_EXTREMITY_*` | Code + label audit |

**FAIL examples:** MRA rows tagged `MODALITY_MRI`; only one carotid contrast row present when both in manifest.

---

### 1.6 US tuple validation (Wave 3 scope)

| Test | Pass criteria |
|------|---------------|
| **No** Wave 3 tuple pass on legacy codes | 0 protocol mutations in 2E.7B unless explicitly scoped |
| `US_VENOUS_DOPPLER_LE` unchanged | Still single canonical LE venous |
| No `US_VENOUS_DOPPLER_LE_LEFT`/`_RIGHT` created | Governance |
| No `DOPPLER_VEIN` recreation | Count = 1 baseline row only |
| US-2 arterial protocol | `PROTOCOL_US_DOPPLER_ARTERIAL` on arterial rows |

**FAIL examples:** new `DOPPLER_VEIN`; duplicate LE venous lateral codes; tuple pass breaks Wave 2 `US_ABDOMEN` protocol.

---

### 1.7 FL validation

| Test | Pass criteria |
|------|---------------|
| `MODALITY_FL` filter returns **4** codes | Full seed |
| Protocol FKs set per workbook | 4/4 |
| Esophagram body region | `BODY_REGION_ABDOMEN` + `PROTOCOL_FL_ESOPHAGRAM` |

**FAIL examples:** FL rows tagged `MODALITY_XR`; missing protocol on `FL_LUMBAR_PUNCTURE`.

---

### 1.8 NM validation

| Test | Pass criteria |
|------|---------------|
| `MODALITY_NM` filter returns **5** codes | Full seed |
| Three distinct V/Q codes active | perfusion / ventilation / combined |
| HIDA vs GB emptying | separate codes, shared hepatobiliary region |

**FAIL examples:** merged V/Q single code; `MODALITY_CT` mis-tag.

---

### 1.9 Billing validation

| Test | Pass criteria |
|------|---------------|
| All 41 `PENDING_CPT_REVIEW` | No priced CPT auto-applied |
| `billingCodeDefault` null on Wave 3 | 41/41 |

**FAIL examples:** any Wave 3 row with CPT populated at seed.

---

### 1.10 Retirement validation

| Test | Pass criteria |
|------|---------------|
| `CT_HEAD` not orderable | inactive |
| Predecessors until Phase 2D | `CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA` policy unchanged |
| No Wave 3 row with `retirementImpact` | workbook NONE |

**FAIL examples:** `CT_HEAD` reactivated; new `US_ABD` row.

---

### 1.11 Idempotency validation

| Test | Pass criteria |
|------|---------------|
| Re-run staging seed | `41 studies, 0 aliases` (or documented idempotent alias behavior) |
| Active count unchanged | **182** (full) |

**FAIL examples:** second run creates duplicate aliases or duplicate active codes.

---

## 2. Expected overall outcomes

| Outcome | Criteria |
|---------|----------|
| **PASS** | All domains above pass for signed scope (full or pilot) |
| **PASS WITH OBSERVATIONS** | Catalog + classifier + regression pass; search misses on optional aliases only |
| **FAIL** | Any forbidden insert, count mismatch, B1B regression, or Doppler duplication |

---

## 3. Staging script (2E.7B deliverable)

Implement `prisma/scripts/wave3-staging-validation.ts` mirroring Wave 2 pattern:

- Read-only checks + search smoke
- Exit code **0** only when `summary.pass === true`
- Emit JSON: `wave3Studies`, `wave3Aliases`, `totalActiveImaging`, per-check array

---

*No validation executed in 2E.7A.*
