# Wave 3 Alias Package (Phase 2E.7A)

**Phase:** 2E.7A — design only  
**Date:** 2026-06-01  
**Workbook source:** `aliasRequired` on Wave 3 rows (`implementationBatch` MRI-2 … NM-1)  
**Legacy mapping:** 2E.2C / 2E.2D / 2E.2E candidate lists

---

## 1. Summary (workbook-derived)

| Class | Catalog codes | Alias strings (est.) |
|-------|--------------|---------------------:|
| **REQUIRED** | **0** | **0** |
| **OPTIONAL** | **41** | **~55–75** |
| **NONE** | **0** | — |

| Metric | Count |
|--------|------:|
| **Total alias strings (Wave 3 scope, est.)** | **~55–75** |
| **Required alias codes (workbook)** | **0** |
| **Recommended high-value OPTIONAL codes** | **~12** (see §3) |
| **Duplicate alias conflicts (within Wave 3 design)** | **0** |
| **Cross-wave collision (design-time)** | **0** |

---

## 2. Workbook classification (41 codes)

All **41** Wave 3 rows have `aliasRequired=OPTIONAL`. No workbook row is `REQUIRED` or `NONE`.

| Batch | Codes | Workbook alias |
|-------|------:|----------------|
| MRI-2 | 14 | OPTIONAL (all) |
| MRA-1 | 5 | OPTIONAL (all) |
| US-2 | 10 | OPTIONAL (all) |
| US-3 | 3 | OPTIONAL (all) |
| FL-1 | 4 | OPTIONAL (all) |
| NM-1 | 5 | OPTIONAL (all) |

---

## 3. Recommended OPTIONAL authoring (2E.7B — not workbook REQUIRED)

Highest clinical/search value for Haiti pilot:

| Batch | Code | Example legacy / shorthand aliases |
|-------|------|----------------------------------|
| US-2 | `US_CAROTID_DUPLEX` | carotid duplex; duplex carotidien; US carotid |
| US-2 | `US_ARTERIAL_DOPPLER_LE_*` | LE arterial doppler; Doppler artériel MI |
| US-2 | `US_VENOUS_DOPPLER_UE_*` | UE venous doppler; Doppler veineux MS |
| MRA-1 | `MRA_CAROTID_*` | MRA carotid; ARM carotides |
| MRA-1 | `MRA_LE_*` | MRA lower extremity; ARM membre inférieur |
| MRI-2 | `MRI_KNEE_*` | knee MRI; IRM genou |
| MRI-2 | `MRI_CHOLANGIOGRAM` | MRCP; cholangiogram; IRM cholédoque |
| FL-1 | `FL_ESOPHAGRAM` | swallow study; œsophagogramme |
| NM-1 | `NM_HIDA` | HIDA; scintigraphie biliaire |
| NM-1 | `NM_VQ_*` | VQ scan; scintigraphie V/Q |

*Full OPTIONAL set is implementation-phase (2E.7B); not blocking staging authorization.*

---

## 4. REQUIRED / OPTIONAL / NONE — return counts

| Class | Code count | Est. alias strings |
|-------|----------:|-------------------:|
| **REQUIRED** | **0** | **0** |
| **OPTIONAL** | **41** | **~55–75** |
| **NONE** | **0** | **0** |
| **Total** | **41** | **~55–75** |

---

## 5. Verification

| Check | Result |
|-------|--------|
| No duplicate alias → two Wave 3 codes (design) | **PASS** |
| No alias targeting retired `CT_HEAD` | **PASS** |
| No alias recreating `DOPPLER_VEIN` / `US_ABD` / `CT_ABD` | **PASS** |
| No collision with Wave 1 codes (distinct catalog codes) | **PASS** |
| No collision with Wave 2 codes | **PASS** |
| No collision with Haiti 44 manifest codes | **PASS** |
| US-2 must not alias-map to `US_VENOUS_DOPPLER_LE` as a *new* code | **PASS** (distinct UE codes only) |
| Carotid US vs `CTA_HEAD_NECK` / `US_CAROTID` naming | **PASS** — French labels disambiguate modality |
| Retirement conflicts | **PASS** — `retirementImpact=NONE` on all 41 |
| Successor conflicts | **PASS** — US-2 `successorImpact=AVOID_DOPPLER_VEIN` honored in design |
| Global production duplicate alias strings (pre-existing) | **6** groups — re-validate at staging; not introduced by Wave 3 design |

---

*No alias DB writes in 2E.7A.*
