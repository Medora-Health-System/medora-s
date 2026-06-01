# X-Ray Expansion Batch Plan (Phase 2E.2A)

**Phase:** 2E.2A  
**Date:** 2026-06-01  
**Reference:** `xray-expansion-candidate-list.md` (79 core + 33 extended codes)  

---

## 1. Batch overview

| Batch | Focus | New catalog rows | Legacy rows covered | Risk |
|-------|--------|-----------------:|--------------------:|------|
| **XR-1** | Spine, ribs, abdomen MR | **19** | 19 | **Medium** |
| **XR-2** | MSK laterality / view EXPAND | **53** | 55 legacy *(2 Os Calcis → alias)* | **High** |
| **XR-3** | MSK-adjacent + head/face/peds MISSING (core remainder) | **7** | 7 | **Medium** |
| **XR-3b** *(optional)* | Extended enterprise parity | **33** | 33 | **Low–Medium** |
| **Tuple pass** *(parallel)* | Chest decub / post-intub | **0** | 2 | **Low** |

**Core implementation total:** **79** rows (XR-1 + XR-2 + XR-3)  
**Enterprise maximum:** **112** rows (+ XR-3b)

---

## 2. Batch XR-1 — Spine, ribs, abdomen (19 rows)

### 2.1 Scope

| Subgroup | Codes | Count |
|----------|-------|------:|
| C-spine | `XR_CSPINE_1V_LATERAL`, `XR_CSPINE_2_3V`, `XR_CSPINE_3V_UPRIGHT`, `XR_CSPINE_COMPLETE` | 4 |
| L-spine | `XR_LSPINE_2V`, `XR_LSPINE_2V_UPRIGHT`, `XR_LSPINE_3V`, `XR_LSPINE_3V_UPRIGHT` | 4 |
| T-spine / thoracolumbar | `XR_TSPINE_2V`, `XR_TSPINE_3V_UPRIGHT`, `XR_THORACOLUMBAR_2V` | 3 |
| Sacrum/coccyx | `XR_SACRUM_COCCYX_2V` | 1 |
| Ribs | `XR_RIBS_LEFT`, `XR_RIBS_RIGHT`, `XR_RIBS_LEFT_WITH_CXR`, `XR_RIBS_RIGHT_WITH_CXR` | 4 |
| Abdomen MR | `XR_ABDOMEN_1V`, `XR_ABDOMEN_2V`, `XR_ABDOMEN_3V_ACUTE` | 3 |

### 2.2 Clinical rationale

Highest trauma and ED relevance; spine and rib studies absent from Haiti 44; resolves abdomen vs KUB ambiguity.

### 2.3 Deliverables (implementation phase)

- 19 `CatalogImagingStudy` seed rows + classifier FKs
- `ImagingStudyAlias` for legacy strings
- Workbook CSV rows (Gate W2 slice)
- FR label review

### 2.4 Risk

**Medium** — rib/CXR combo billing; upright protocol classifiers must exist in ICM-1.0.

---

## 3. Batch XR-2 — MSK EXPAND (53 rows)

### 3.1 Scope

All **EXPAND** studies from generic MSK Haiti codes:

| Region | Rows |
|--------|-----:|
| Knee | 8 |
| Ankle | 4 |
| Foot | 5 |
| Calcaneus | 2 |
| Elbow | 6 |
| Wrist | 4 |
| Shoulder | 4 |
| Hip | 5 |
| Hand | 4 |
| Humerus | 2 |
| Femur | 2 |
| Forearm | 2 |
| Tibia/fibula | 2 |
| Pelvis | 2 |
| Infant foot | 1 |
| **Total** | **53** |

**Excluded:** Os Calcis Left/Right → **ALIAS** to calcaneus codes (no extra rows).

### 3.2 Clinical rationale

Largest legacy volume; aligns enterprise orderables with `LATERALITY_*` and `VIEW_COUNT_*` per ICM-1.0 MR-M1 policy.

### 3.3 Deliverables

- 53 catalog rows
- Aliases from all legacy `* Left *V` / `* Right *V` strings
- Search tokens per region

### 3.4 Risk

**High** — catalog size jump; order UI density; verify no duplicate with generic `XR_KNEE` etc. *(Generics remain active; alias routing until optional future retirement.)*

---

## 4. Batch XR-3 — Shoulder girdle MISSING core (7 rows)

### 4.1 Scope

| Code | Legacy |
|------|--------|
| `XR_AC_JOINT_BILATERAL_2V` | AC Joint Bilat 2V |
| `XR_AC_JOINT_LEFT_2V` | AC Joint Left 2V |
| `XR_AC_JOINT_RIGHT_2V` | AC Joint Right 2V |
| `XR_CLAVICLE_LEFT_2V` | Clavicle Left 2V |
| `XR_CLAVICLE_RIGHT_2V` | Clavicle Right 2V |
| `XR_SCAPULA_LEFT` | Scapula Left |
| `XR_SCAPULA_RIGHT` | Scapula Right |

### 4.2 Risk

**Medium** — subregion classifiers on shoulder anchor; CPT shoulder vs AC joint.

---

## 5. Batch XR-3b — Extended parity (33 rows) *(optional)*

| Group | Count |
|-------|------:|
| Finger, toe, orbit | 12 |
| Facial, mandible, nasal, skull, sinus | 9 |
| Neck, sternum | 2 |
| Pedi / infant | 5–6 |
| Panorex, TMJ | 2 |
| Remaining MISSING | balance |

**Trigger:** Haiti pilot scope expansion or enterprise mandate for full 267 legacy parity.

**Risk:** **Low–Medium** — lower volume; dental/peds may be out of pilot scope.

---

## 6. Parallel: tuple pass (0 rows)

| Legacy | Action |
|--------|--------|
| Chest 1V Decub | `XR_CHEST` + `PROTOCOL_XR_CHEST_DECUBITUS` |
| Chest Post Intubation | `XR_CHEST` + `PROTOCOL_XR_CHEST_POST_INTUBATION` |

Run with XR-1 or immediately before — no catalog insert.

---

## 7. Recommended sequence

```text
Tuple pass (0 rows)
    ↓
XR-1 (19) — spine / ribs / abdomen
    ↓
XR-2 (53) — MSK EXPAND
    ↓
XR-3 (7) — AC / clavicle / scapula
    ↓
[Gate W2 sign-off per batch]
    ↓
XR-3b (33) — optional full parity
```

---

## 8. Gate W2 checklist (per batch)

- [ ] Workbook CSV slice committed to `docs/imaging/`
- [ ] No retirement governance violations
- [ ] Classifier tuple validation (ICM-1.0)
- [ ] French `displayNameFr` authored
- [ ] Staging seed dry-run
- [ ] Search alias smoke test
- [ ] Clinical sign-off for batch scope

---

## 9. Return summary

| Metric | Value |
|--------|------:|
| **Total XR legacy studies** | **118** |
| **Core new catalog rows** | **79** |
| **Extended new catalog rows (optional)** | **33** |
| **Enterprise maximum new rows** | **112** |
| **Batch XR-1** | **19** |
| **Batch XR-2** | **53** |
| **Batch XR-3** | **7** |
| **Batch XR-3b** | **33** |

| Verdict | |
|---------|---|
| **2E.2A design** | **SAFE** |
| **2E.2A implementation** | **NOT SAFE** until Gate W2 + per-batch sign-off |

---

*Audit only — no implementation.*
