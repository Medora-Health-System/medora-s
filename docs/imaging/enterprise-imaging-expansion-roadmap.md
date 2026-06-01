# Enterprise Imaging Expansion Roadmap (Phase 2E.1)

**Phase:** 2E.1 — recommended implementation batching  
**Date:** 2026-06-01  
**Prerequisites:** Gate W1 closed; 3C-B1 classifier backfill applied; Gate W2 **open**  

**Net-new catalog target (all batches):** **62–97** codes → **~105–140** active rows total  

---

## 1. Rollout strategy

| Principle | Detail |
|-----------|--------|
| **Batch by modality** | Reduces seed/review blast radius |
| **Alias before row** | TUPLE_VARIANT (21 legacy rows) before new codes |
| **No retirement in 2E** | Phase 2D remains separate |
| **Gate W2 per batch** | Workbook CSV slice + clinical sign-off each batch |
| **Haiti pilot filter** | Optional: ship subsets marked *pilot-critical* first |

---

## 2. Batch overview

| Batch | Scope | Est. new codes | Legacy rows addressed | Risk |
|-------|--------|---------------:|----------------------:|------|
| **2E.2A** | X-Ray expansion | **38–48** | ~115 (53 MISSING + 62 EXPAND XR) | **High** |
| **2E.2B** | CT / CTA expansion | **18–24** | ~55 (25+4 MISSING + 11 CT EXPAND + CTA MR) | **High** |
| **2E.2C** | MRI / MRA expansion | **14–18** | ~32 (14+5 MISSING + 11 MRI EXPAND) | **High** |
| **2E.2D** | Ultrasound expansion | **16–22** | ~41 (27 MISSING + 14 PARTIAL US) | **Medium** |
| **2E.2E** | FL / Nuclear Medicine | **9** | 9 (all MISSING) | **Medium** (scope) |
| **Tuple/alias pass** | No new rows | **0** | 21 PARTIAL | **Low** |

*Counts overlap-clustered; sum ≈ 62–97 unique codes.*

---

## 3. Batch 2E.2A — X-Ray expansion

### 3.1 Scope

| Category | Legacy rows | Est. codes |
|----------|------------:|-----------:|
| MISSING XR (spine, ribs, face, pedi, etc.) | 53 | 28–35 |
| EXPAND XR (laterality + view on MSK) | 58 | 10–13 *(if TUPLE policy: 0)* |
| MANUAL_REVIEW XR | 5 | 0–2 |

### 3.2 Deliverables (implementation phase — not 2E.1)

- New `CatalogImagingStudy` rows with full classifier tuple (modality, body, view, laterality)
- `ImagingStudyAlias` from legacy display names
- Workbook CSV rows for batch
- FR labels clinical review

### 3.3 Pilot-critical subset (optional first slice)

| Priority | Examples |
|----------|----------|
| P0 | C-spine, L-spine, ribs, abdomen views (post MR resolution) |
| P1 | Orbit, finger, toe, sinus |
| P2 | Pediagram, babygram, panorex, TMJ |

### 3.4 Risk

**High** — EXPAND vs TUPLE decision drives 0 vs 58 codes. Requires radiology policy on `LATERALITY_LEFT` vs generic `XR_KNEE`.

---

## 4. Batch 2E.2B — CT / CTA expansion

### 4.1 Scope

| Category | Legacy rows | Est. codes |
|----------|------------:|-----------:|
| MISSING CT | 25 | 14–18 |
| EXPAND CT contrast | 11 | 6–8 |
| MISSING CTA (extremity) | 4 | 4 |
| CTA MANUAL_REVIEW | 4 | 0–2 (protocol-only) |

### 4.2 Representative new codes

- `CT_HEAD_W_CONTRAST`, `CT_CHEST_W_CONTRAST`, `CT_CHEST_W_WO_CONTRAST`
- `CT_TSPINE_WO_CONTRAST`, `CT_FACIAL_WO_CONTRAST`, `CT_STN_WO_CONTRAST`
- `CTA_LE_LEFT`, `CTA_LE_RIGHT`, `CTA_UE_LEFT`, `CTA_UE_RIGHT`

### 4.3 Governance guards

- **No** active `CT_HEAD` resurrection
- **No** parallel `CT_ABD` — use `CT_ABDOMEN_PELVIS` contrast family
- `CTA_CHEST` triple rule-out → protocol only

### 4.4 Risk

**High** — contrast CPT; trauma CAP contrast remains intentional null on existing row.

---

## 5. Batch 2E.2C — MRI / MRA expansion

### 5.1 Scope

| Category | Legacy rows | Est. codes |
|----------|------------:|-----------:|
| MISSING MRI | 14 | 10–12 |
| EXPAND MRI contrast + spine | 11 | 4–6 |
| MISSING MRA (entire family) | 5 | 5 |

### 5.2 Representative new codes

- `MRI_SPINE_CERVICAL_WO_CONTRAST`, `MRI_SPINE_LUMBAR_W_CONTRAST`, `MRI_SPINE_THORACIC_WO_CONTRAST`
- `MRI_KNEE_LEFT`, `MRI_PELVIS`, `MRI_SELLA`, `MRI_CHOLANGIOGRAM`
- `MRA_BRAIN`, `MRA_CAROTID_WO_CONTRAST`, `MRA_LE_LEFT_W_CONTRAST`

### 5.3 Risk

**High** — splits generic `MRI_SPINE`; MRA introduces new order family for Haiti pilot validation.

---

## 6. Batch 2E.2D — Ultrasound expansion

### 6.1 Scope

| Category | Legacy rows | Est. codes |
|----------|------------:|-----------:|
| MISSING US | 27 | 14–18 |
| PARTIAL US (TUPLE + alias) | 14 | 0 *(tuple pass)* |
| Predecessor alias | 2 | 0 |

### 6.2 Representative new codes

- `US_BREAST_LEFT`, `US_BREAST_BILATERAL`, `US_THYROID`, `US_CAROTID_DUPLEX`
- `US_UE_VENOUS_DOPPLER_LEFT`, `US_UE_ARTERIAL_DOPPLER_BILATERAL`
- `US_BLADDER`, `US_AORTA`, `US_TRANSVAGINAL` *(if not protocol-only on `US_PELVIS`)*

### 6.3 Risk

**Medium** — OB variants largely protocol on existing `US_OB_FIRST` / `US_OB_GROWTH`.

---

## 7. Batch 2E.2E — Fluoroscopy / nuclear medicine

### 7.1 Scope

| Modality | Legacy rows | Est. codes |
|----------|------------:|-----------:|
| NM | 5 | 5 |
| FL | 4 | 4 |

### 7.2 Codes

| Proposed | Legacy |
|----------|--------|
| `NM_HIDA` | HIDA Scan |
| `NM_VQ_PERFUSION` | VQ Scan Perfusion |
| `NM_VQ_VENTILATION` | VQ Scan Ventilation |
| `NM_VQ_COMBINED` | Lung Scan Perfusion/Ventilation RP |
| `NM_GB_EMPTYING` | Gallbladder Emptying Study RP |
| `FL_ESOPHAGRAM` | Swallow Esophagram |
| `FL_LINE_PLACEMENT` | Line Placement Fluoro |
| `FL_TUBE_PLACEMENT` | Tube Placement Fluoroscopy |
| `FL_LUMBAR_PUNCTURE` | Lumbar Puncture wo Fluoro |

### 7.3 Risk

**Medium (scope)** — confirm Haiti pilot needs NM/FL before implementation. Classifier modality seeds exist; zero catalog rows today.

---

## 8. Pre-batch pass — tuple & alias (0 new codes)

**When:** Before or parallel with 2E.2A (low risk).

| Legacy rows | Action |
|------------:|--------|
| 19 TUPLE_VARIANT | Set protocol/view classifiers on existing 44 codes |
| 2 ALIAS | `US Liver` → `US_RUQ_GALLBLADDER`; WO contrast aliases |
| 8 SUCCESSOR | Alias files pointing to successors (no new rows) |

**Est. effort:** Governance + alias seed only — **no** `CatalogImagingStudy` insert.

---

## 9. Recommended sequence

```text
2E.1 inventory (this phase) ✓
    ↓
2E.1b — Radiology EXPAND vs TUPLE policy (MSK XR)
    ↓
Tuple/alias pass (21 rows)
    ↓
2E.2B CT/CTA (contrast + trauma adjacency)
    ↓
2E.2D US (high clinic volume)
    ↓
2E.2A XR (largest batch — after policy)
    ↓
2E.2C MRI/MRA
    ↓
2E.2E NM/FL (pilot scope gate)
    ↓
2D retirement execution (separate gate)
```

*Sequence optimizes clinical adjacency to existing classified CT/US rows; adjust per Haiti stakeholder input.*

---

## 10. Gate checklist (per batch)

| Step | Owner |
|------|-------|
| Workbook CSV slice for batch | Terminology |
| Classifier tuple validation (ICM-1.0) | Engineering |
| FR displayName review | Clinical |
| CPT / billing status = PENDING ok | Billing governance |
| Successor/retirement collision check | Architecture |
| Search alias QA | Engineering |
| Seed PR + staging dry-run | Engineering |
| Gate W2 batch sign-off | Clinical + ops |

---

## 11. Return summary (2E.1)

| Metric | Value |
|--------|------:|
| **Total legacy studies** | **267** |
| **Total existing (Medora codes)** | **44** (43 active) |
| **Total missing (legacy tier)** | **137** |
| **Total expansion candidates (catalog rows)** | **62–97** |
| **Recommended batch code counts** | 2E.2A: 38–48 · 2E.2B: 18–24 · 2E.2C: 14–18 · 2E.2D: 16–22 · 2E.2E: 9 |

| Verdict | |
|---------|---|
| **2E.1 audit** | **SAFE** |
| **2E.2 implementation** | **NOT SAFE** until Gate W2 + batch sign-off |

---

*Phase 2E.1 — audit only. No code, seeds, migrations, commits, or deployments.*
