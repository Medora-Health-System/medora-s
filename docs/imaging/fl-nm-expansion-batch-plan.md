# Fluoroscopy & Nuclear Medicine Expansion Batch Plan (Phase 2E.2E)

**Phase:** 2E.2E  
**Date:** 2026-06-01  
**Reference:** `fl-nm-expansion-candidate-list.md` (**4** FL + **5** NM = **9** new rows)  

---

## 1. Batch overview

| Batch | Focus | Rows | Risk | Billing review | Complexity |
|-------|--------|-----:|------|---------------:|------------|
| **FL-1** | Fluoroscopy expansion | **4** | **Medium (scope)** | 4 | **S** |
| **NM-1** | Nuclear medicine expansion | **5** | **Medium (scope)** | 5 | **S** |
| **Total** | | **9** | | **9** | |

**Manual-review count:** **0** study-level · **2** batch-level pilot gates (FL-1, NM-1 may be deferred for Haiti MVP).

**Complexity:** **S** = small greenfield modality batches (≤5 rows each, no retirement/predecessor coupling).

---

## 2. Batch FL-1 — Fluoroscopy expansion (4 rows)

### 2.1 Candidates

| Code | Legacy |
|------|--------|
| `FL_ESOPHAGRAM` | Swallow Esophagram |
| `FL_LINE_PLACEMENT` | Line Placement Fluoro |
| `FL_TUBE_PLACEMENT` | Tube Placement Fluoroscopy |
| `FL_LUMBAR_PUNCTURE` | Lumbar Puncture wo Fluoro |

### 2.2 Clinical / operational notes

- Introduces first **`MODALITY_FL`** orderables in catalog and UI filters.  
- Esophagram uses `BODY_REGION_ABDOMEN` + `PROTOCOL_FL_ESOPHAGRAM` per ICM-1.0 (see governance ICM note).  
- LP row supports fluoro-guided puncture despite legacy “wo Fluoro” label.

### 2.3 Risk: **Medium (scope)**

Low duplicate risk; **high pilot uncertainty** — many Haiti clinics do not perform in-house fluoroscopy.

### 2.4 Pilot deferral

**Entire FL-1 batch** may be deferred if Haiti pilot excludes fluoroscopy ordering.

---

## 3. Batch NM-1 — Nuclear medicine expansion (5 rows)

### 3.1 Candidates

| Code | Legacy |
|------|--------|
| `NM_HIDA` | HIDA Scan |
| `NM_GB_EMPTYING` | Gallbladder Emptying Study RP |
| `NM_VQ_PERFUSION` | VQ Scan Perfusion |
| `NM_VQ_VENTILATION` | VQ Scan Ventilation |
| `NM_VQ_COMBINED` | Lung Scan Perfusion/Ventilation RP |

### 3.2 Clinical / operational notes

- Introduces first **`MODALITY_NM`** orderables.  
- Three distinct V/Q codes — do not merge perfusion/ventilation/combined.  
- HIDA and GB emptying share hepatobiliary body region; separated by protocol.

### 3.3 Risk: **Medium (scope)**

Typically referral-based; confirm whether clinic orders NM or only documents external results.

### 3.4 Pilot deferral

**Entire NM-1 batch** may be deferred if Haiti pilot excludes nuclear medicine ordering.

---

## 4. Recommended sequence

```text
FL-1 (4) — optional per pilot
    ∥
NM-1 (5) — optional per pilot
```

*Batches are independent; either may ship alone after Gate W2 sign-off.*

---

## 5. Gate W2 checklist

- [ ] Workbook CSV slice for FL-1 and NM-1  
- [ ] Pilot scope: in-house FL/NM vs referral-only  
- [ ] ICM-1.0 tuple validation (all protocols from manifest §8.6–8.7)  
- [ ] French `displayNameFr` authored  
- [ ] Staging seed + classifier FK backfill  
- [ ] UI modality filter includes FL/NM when active  
- [ ] Clinical sign-off on V/Q three-code policy  

---

## 6. Return summary

| Metric | Value |
|--------|------:|
| **Total FL legacy studies** | **4** |
| **Total NM legacy studies** | **5** |
| **Total new FL candidates** | **4** |
| **Total new NM candidates** | **5** |
| **Total new rows** | **9** |
| **Batch FL-1** | **4** |
| **Batch NM-1** | **5** |
| **Manual-review count (study-level)** | **0** |
| **Billing-review rows** | **9** |

| Verdict | |
|---------|---|
| **2E.2E design** | **SAFE** |
| **2E.2E implementation** | **NOT SAFE** |

### Blockers

1. Gate W2 not closed for FL/NM slice  
2. Haiti pilot scope for FL/NM (may defer both batches)  
3. French labels + CPT review pending  
4. Staging seed + FK backfill not executed  
5. Radiology workflow / referral policy not confirmed  

---

*Audit only — no implementation.*
