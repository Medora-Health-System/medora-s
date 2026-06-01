# Wave 3 Search Adoption Audit (Phase 2E.7E)

**Phase:** 2E.7E — read-only search discoverability audit  
**Date:** 2026-06-01  
**Scope:** Wave 3 families **MRI-2**, **MRA-1**, **US-2**, **US-3**, **FL-1**, **NM-1**  
**Method:** `ImagingCatalogService.search()` — default classifier terminology flags (**off**), matching deployed API

**Parent:** [`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md)

---

## 1. Summary

| Result | Detail |
|--------|--------|
| **Overall** | **PASS WITH OBSERVATIONS** |
| Production validation smokes | **6/6 PASS** |
| Extended matrix (Wave 3–targeted) | **14/16 PASS** |
| Anatomy phrases outside W3 scope | **4** (documented N/A) |
| Blocking failures | **None** |

---

## 2. Production validation smokes (authoritative)

From production `wave3-staging-validation.ts` after seed run 1 (2026-06-01):

| Query | Expected code(s) | Result |
|-------|------------------|--------|
| `mri knee left` | `MRI_KNEE_LEFT` | **PASS** |
| `mra carotid wo` | `MRA_CAROTID_WO_CONTRAST` | **PASS** |
| `carotid duplex` | `US_CAROTID_DUPLEX` | **PASS** |
| `échographie mammaire` | `US_BREAST_*` | **PASS** |
| `hida` | `NM_HIDA` | **PASS** |
| `œsophagogramme` | `FL_ESOPHAGRAM` | **PASS** |
| `ct head` (regression) | No `CT_HEAD` | **PASS** |

---

## 3. Extended adoption matrix

**Evidence:** Read-only search against production-equivalent catalog (post–`d080595d` seed). Phrases evaluated for **Wave 3 discoverability**.

### MRI (Wave 3 MRI-2 scope)

| Query | In W3 manifest? | Wave 3 hit(s) | Pass | Notes |
|-------|:---------------:|---------------|------|-------|
| `mri knee left` | Yes | `MRI_KNEE_LEFT` | **YES** | Production smoke |
| `mri knee right` | Yes | `MRI_KNEE_RIGHT` | **YES** | |
| `mri shoulder left` | **No** | — | **N/A** | No shoulder MRI in Wave 3; use `mri upper extremity` or future wave |
| `mri shoulder right` | **No** | — | **N/A** | Same |
| `mri elbow` | **No** | — | **N/A** | Use `mri upper extremity` |
| `mri wrist` | **No** | — | **N/A** | Use `mri upper extremity` |
| `mri ankle` | **No** | — | **N/A** | Use `mri lower extremity` |

**Wave 3 MRI-2 includes:** hip, knee, pelvis, sella, UE, LE, cholangiogram — not discrete shoulder/elbow/wrist/ankle MRI rows.

| Mitigation query | Wave 3 hit |
|------------------|------------|
| `mri pelvis` | `MRI_PELVIS`, `MRI_PELVIS_LIMITED` |
| `mri upper extremity` | `MRI_UPPER_EXTREMITY_*` |
| `mri lower extremity` | `MRI_LOWER_EXTREMITY_*` |

### MRA (MRA-1)

| Query | Wave 3 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `mra carotid` | `MRA_CAROTID_WO_CONTRAST`, `MRA_CAROTID_W_CONTRAST` | **YES** | |
| `mra neck` | — | **NO** | OBS-W3-S-01: use `mra carotid` or `ARM carotides` |
| `mra brain` | `MRA_BRAIN` | **YES** | |

### Ultrasound (US-2 / US-3)

| Query | Wave 3 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `carotid duplex` | `US_CAROTID_DUPLEX` | **YES** | |
| `breast ultrasound` | `US_BREAST_*` | **YES** | |
| `échographie mammaire` | `US_BREAST_*` | **YES** | Production smoke |
| `arterial doppler` | `US_ARTERIAL_DOPPLER_*` | **YES** | LE + UE rows |
| `venous doppler` | `US_VENOUS_DOPPLER_UE_*`, `US_VENOUS_DOPPLER_LE` | **YES** | LE canonical remains baseline |

### Nuclear medicine (NM-1)

| Query | Wave 3 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `hida` | `NM_HIDA` | **YES** | Production smoke |
| `vq scan` | `NM_VQ_COMBINED` | **YES** | |
| `ventilation perfusion` | — | **NO** | OBS-W3-S-02: use `vq scan`, `vq perfusion`, or `scintigraphie V/Q perfusion` |

### Fluoroscopy (FL-1)

| Query | Wave 3 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `esophagram` | `FL_ESOPHAGRAM` | **YES** | |
| `œsophagogramme` | `FL_ESOPHAGRAM` | **YES** | Production smoke |

**Wave 3–targeted strict pass rate:** **14 / 16** (87.5%), excluding 4 out-of-scope MRI anatomy phrases.

---

## 4. Observations (non-blocking)

### OBS-W3-S-01 — `mra neck` returns empty

| Field | Value |
|-------|--------|
| **Mitigation** | `mra carotid`, `ARM carotides`, `MRA carotid wo` |
| **Severity** | Low |

### OBS-W3-S-02 — `ventilation perfusion` returns empty

| Field | Value |
|-------|--------|
| **Mitigation** | `vq scan`, `vq perfusion`, `scintigraphie V/Q perfusion` → `NM_VQ_PERFUSION` |
| **Severity** | Low |

### OBS-W3-S-03 — MRI shoulder / elbow / wrist / ankle not in Wave 3

| Field | Value |
|-------|--------|
| **Impact** | Empty search for those phrases is **expected** — not a deployment defect |
| **Mitigation** | `mri upper extremity`, `mri lower extremity`, `mri pelvis`, or browse MRI modality filter |
| **Severity** | Low (scope documentation) |

### OBS-W3-S-04 — Global duplicate alias groups (carry-forward)

Six pre-existing groups from Wave 1/2 era (`ct abdomen`, `echo abdomen`, etc.) — unchanged; not introduced by Wave 3.

---

## 5. Verdict

| Criterion | Result |
|-----------|--------|
| Wave 3 clinically representative discovery | **PASS** |
| French order-entry phrases (US, FL, breast) | **PASS** |
| New modalities (MRA, FL, NM) discoverable | **PASS** |
| **Search adoption (2E.7E)** | **PASS WITH OBSERVATIONS** |

---

*End of Wave 3 search adoption audit (Phase 2E.7E).*
