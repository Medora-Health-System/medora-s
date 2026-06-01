# Ultrasound Expansion Batch Plan (Phase 2E.2D)

**Phase:** 2E.2D  
**Date:** 2026-06-01  
**Reference:** `ultrasound-expansion-candidate-list.md` (**17** new rows)  

---

## 1. Batch overview

| Batch | Focus | New rows | Tuple / alias work | Risk | Billing review |
|-------|--------|--------:|-------------------|------|---------------:|
| **US-1** | Core ultrasound + OB/pelvis/abdomen tuple pass | **4** | **15** PARTIAL protocols | **Medium** | 4 |
| **US-2** | Doppler expansion | **10** | LE venous **EXISTS** only | **Medium** | 10 |
| **US-3** | Advanced (breast) | **3** | — | **Low** | 3 |
| **Total** | | **17** | 15 + 2 aliases | | **17** |

**Manual-review count:** **8** legacy studies deferred (no rows in this plan).

**Implementation complexity (est.):** US-1 **M** (tuple + 4 rows) · US-2 **M** (Doppler family) · US-3 **S** (3 rows).

---

## 2. Batch US-1 — Core ultrasound

### 2.1 New catalog rows (4)

| Code | Legacy driver |
|------|---------------|
| `US_THYROID` | US Thyroid / Neck |
| `US_AORTA` | US Aorta |
| `US_BLADDER` | US Bladder |
| `US_CHEST` | US Chest |

### 2.2 Tuple pass (0 inserts — same batch)

| Target code | Protocols to attach / alias |
|-------------|----------------------------|
| `US_ABDOMEN` | `PROTOCOL_US_ABDOMEN_LIMITED` |
| `US_OB_FIRST` | First-trimester limited, TV, standard |
| `US_OB_GROWTH` | Late limited, portable, BPP, standard |
| `US_PELVIS` | Transvaginal, pelvic Doppler, limited |
| `US_SOFT` | `PROTOCOL_US_NECK_THYROID` |

### 2.3 Risk: **Medium**

High clinic volume for OB/RUQ already covered; tuple pass must not break existing classifier backfill on 44 rows.

### 2.4 Deliverables (implementation phase)

- 4 catalog rows + FK backfill  
- Protocol classifier updates on 5 existing US codes  
- Confirm `US_ABD` / `US_OB` predecessors unchanged until Phase 2D retirement execution  

---

## 3. Batch US-2 — Doppler expansion

### 3.1 New catalog rows (10)

| Subgroup | Codes | Count |
|----------|-------|------:|
| Carotid | `US_CAROTID_DUPLEX` | 1 |
| LE arterial | `US_ARTERIAL_DOPPLER_LE_BILATERAL`, `_LEFT`, `_RIGHT` | 3 |
| UE venous | `US_VENOUS_DOPPLER_UE_BILATERAL`, `_LEFT`, `_RIGHT` | 3 |
| UE arterial | `US_ARTERIAL_DOPPLER_UE_BILATERAL`, `_LEFT`, `_RIGHT` | 3 |

### 3.2 Explicit exclusions

- **No** new `DOPPLER_VEIN`  
- **No** new LE venous codes (legacy FULL → `US_VENOUS_DOPPLER_LE`)  
- **No** renal Doppler row (no legacy study)  

### 3.3 Risk: **Medium**

New orderables adjacent to `US_VENOUS_DOPPLER_LE`; carotid vs `CTA_HEAD_NECK` modality separation required in UI labels (French).

### 3.4 Pilot deferral option

Defer UE Doppler (6 rows) if Haiti pilot does not perform UE vascular US.

---

## 4. Batch US-3 — Advanced ultrasound

### 4.1 New catalog rows (3)

`US_BREAST_BILATERAL`, `US_BREAST_LEFT`, `US_BREAST_RIGHT`

### 4.2 Risk: **Low**

Specialty volume; may defer entire batch if breast US not in Haiti pilot scope.

---

## 5. MANUAL_REVIEW queue (8 studies — out of batch)

| Studies | Recommended action |
|---------|-------------------|
| Axilla, buttocks, upper/lower back | Phase **2E.2D-b** or pilot exclusion |
| Groin + PSA variants (4) | Clinical policy for PSA vs generic groin |

---

## 6. Recommended sequence

```text
US-1 tuple pass (classifiers on existing 44 slice)
    ↓
US-1 new rows (4)
    ↓
US-2 Doppler (10) — optional UE subset defer
    ↓
US-3 Breast (3) — optional full defer
```

*US-2 may start after US-1 tuple pass validates OB/pelvis protocols.*

---

## 7. Gate W2 checklist

- [ ] Workbook CSV slice per batch  
- [ ] `US_VENOUS_DOPPLER_LE` unchanged; no `DOPPLER_VEIN` duplicate  
- [ ] `US_ABDOMEN` / no `US_ABD` expansion  
- [ ] ICM-1.0 tuple validation  
- [ ] French `displayNameFr`  
- [ ] Staging seed + FK backfill  
- [ ] MANUAL_REVIEW queue disposition  
- [ ] Clinical sign-off on OB protocol tuples  

---

## 8. Return summary

| Metric | Value |
|--------|------:|
| **Total ultrasound legacy studies** | **53** |
| **Total new ultrasound candidates** | **17** |
| **Batch US-1 / US-2 / US-3** | **4** / **10** / **3** |
| **Manual-review count** | **8** |
| **Billing-review rows** | **17** |

| Verdict | |
|---------|---|
| **2E.2D design** | **SAFE** |
| **2E.2D implementation** | **NOT SAFE** |

### Blockers

1. Gate W2 not closed for US slice  
2. Tuple/protocol pass on existing US rows not signed off  
3. French labels + CPT review pending  
4. Eight MANUAL_REVIEW studies unresolved for pilot scope  
5. Phase 2D retirement execution still separate (predecessor codes remain in seed)  

---

*Audit only — no implementation.*
