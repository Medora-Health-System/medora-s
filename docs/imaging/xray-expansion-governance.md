# X-Ray Expansion Governance (Phase 2E.2A)

**Phase:** 2E.2A — audit + design only  
**Date:** 2026-06-01  
**Prerequisites:** 2E.1 complete; Gate W1 closed; 3C-B1 classifier backfill on Haiti 44  
**Authority:** `legacy-vs-medora-coverage.md`, `enterprise-imaging-expansion-*.md`, ICM-1.0  

---

## 1. Scope

| Item | Value |
|------|--------|
| Modality family | **X-Ray** (legacy `X-Ray` / `MODALITY_XR`) |
| Legacy studies | **118** |
| Current Medora XR codes | **17** active (+ `XR_ABDOMEN` ambiguity) |
| New catalog rows (this design) | **79** recommended · **112** enterprise-faithful maximum |
| Out of scope | CT, US, MRI, retirement **execution** (Phase 2D) |

---

## 2. Part 1 — XR expansion inventory (118 studies)

### 2.1 Classification summary

| 2E.2A disposition | Legacy rows | New `CatalogImagingStudy`? |
|-------------------|------------:|:--------------------------:|
| **EXISTS** (FULL) | 3 | No |
| **TUPLE** | 2 | No — protocol + alias on existing |
| **ALIAS** | 2 | No — alias on EXPAND/calcaneus codes |
| **MANUAL_REVIEW** | 5 | **Yes** — 5 codes (governance resolution) |
| **EXPAND** | 55 | **Yes** — 53 net-new after calcaneus dedupe |
| **MISSING** | 52 | **Yes** — 51 net-new after coccyx dedupe |
| **Total** | **118** | **79–112** |

*EXISTS = Phase 3A FULL match to current catalog.*

### 2.2 EXISTS (3) — no new row

| Legacy study | Medora code |
|--------------|-------------|
| Abdomen KUB | `XR_ABD_AP` |
| Chest X-Ray 1 View (CXR) | `XR_CHEST` |
| Chest X-Ray 2 View (CXR) | `XR_CHEST_2V` |

### 2.3 TUPLE (2) — no new row

| Legacy study | Target code | Classifier action |
|--------------|-------------|-------------------|
| Chest 1V Decub | `XR_CHEST` | `PROTOCOL_XR_CHEST_DECUBITUS` + alias |
| Chest Post Intubation | `XR_CHEST` | `PROTOCOL_XR_CHEST_POST_INTUBATION` + alias |

### 2.4 ALIAS (2) — no new row

| Legacy study | Target code | Notes |
|--------------|-------------|-------|
| Os Calcis Left 2V | `XR_CALCANEUS_LEFT_2V` | Alias only (same as Calcaneus Left 2V) |
| Os Calcis Right 2V | `XR_CALCANEUS_RIGHT_2V` | Alias only |

*Calcaneus Left/Right 2V are **EXPAND** rows; Os Calcis maps via alias.*

### 2.5 MANUAL_REVIEW (5) — resolved for 2E.2A design

| Legacy study | Resolution | Proposed code |
|--------------|------------|---------------|
| Abdomen 1V | Separate from KUB | `XR_ABDOMEN_1V` |
| Abdomen 2V | Separate from KUB | `XR_ABDOMEN_2V` |
| Abdomen 3V Acute Series | Acute protocol row | `XR_ABDOMEN_3V_ACUTE` |
| Ribs Left with CXR | Combo orderable | `XR_RIBS_LEFT_WITH_CXR` |
| Ribs Right with CXR | Combo orderable | `XR_RIBS_RIGHT_WITH_CXR` |

*Clinical sign-off required before seed; aligns with `imaging-normalization-rules.md` separate-row policy when billing differs.*

### 2.6 EXPAND (55) — laterality / view split on existing body-region codes

All map from generic Medora codes (`XR_KNEE`, `XR_ANKLE`, etc.) to side- and view-specific orderables.

| Body region (anchor) | EXPAND rows | Legacy examples |
|----------------------|------------:|-----------------|
| Knee | 8 | Left/Right 1V Sunrise, 2V, 3V, 4V |
| Ankle | 4 | Left/Right 2V, 3V |
| Foot | 5 | Bilateral 2V, Left/Right 2V, 3V |
| Calcaneus | 2 | Left/Right 2V *(Os Calcis → ALIAS)* |
| Elbow | 6 | Left/Right 2V, 3V, 4V |
| Wrist | 4 | Left/Right 2V, 3V |
| Shoulder | 4 | Left/Right 2V, 3V |
| Hip | 5 | Bilateral w Pelvis, Left/Right 1V, 2V |
| Hand | 4 | Left/Right 2V, 3V |
| Humerus | 2 | Left/Right 2V |
| Femur | 2 | Left/Right 2V |
| Forearm | 2 | Left/Right 2V |
| Tibia/Fibula | 2 | Left/Right 2V |
| Pelvis | 2 | AP, Complete |
| Infant foot | 1 | Infant Foot Left 2V |

### 2.7 MISSING (52) — no Medora anchor code

| Category | Count | Examples |
|----------|------:|----------|
| MSK / joint (non-seeded) | 9 | AC joint (3), clavicle (2), scapula (2), finger (4) → 9 |
| Spine (XR) | 12 | C-spine (4), L-spine (4), T-spine (3), thoracolumbar (1) |
| Head / face / neck | 14 | Orbit (4), skull (2), sinus (2), facial (2), mandible (2), nasal (1), neck soft tissue (1), panorex (1), TMJ (1) |
| Chest-adjacent | 2 | Ribs left/right *(CXR combo → MR)* |
| Pedi / infant | 5 | Babygram, pediagram, infant LE/UE (4) |
| Other | 10 | Sternum, coccyx/sacrum (1), toe (4), babygram counted |

*Full row list: `xray-expansion-candidate-list.md`.*

---

## 3. Part 3 — Duplicate safety (Phase 2C / 2D)

| Check | Result |
|-------|--------|
| **CT_HEAD / non-XR retirement** | **PASS** — no XR code reuses retired CT rows |
| **Duplicate active codes** | **PASS** — all proposed codes unique; prefix `XR_` + region + side + view |
| **Successor violations** | **PASS** — no XR predecessor pairs in 2D queue |
| **Alias conflicts** | **PASS** — Os Calcis defers to calcaneus codes; CXR 1V/2V remain on `XR_CHEST` / `XR_CHEST_2V` |
| **`XR_ABDOMEN` vs `XR_ABD_AP`** | **GOVERNED** — MR resolution creates `XR_ABDOMEN_*` distinct from `XR_ABD_AP` (KUB) |
| **Coccyx duplicate legacy names** | **PASS** — single code `XR_SACRUM_COCCYX_2V` + alias for alternate label |
| **Existing 17 XR codes unchanged** | **PASS** — expansion is additive; generic MSK codes may later alias-only after cutover *(future 2D optional)* |

**Forbidden:**

- Reactivating or duplicating non-XR retired codes.
- Creating `XR_CHEST_1V` that collides with `XR_CHEST` (use tuple for decub).
- Second KUB code (KUB stays `XR_ABD_AP` only).

---

## 4. Classifier policy (ICM-1.0)

| Field | XR rule |
|-------|---------|
| Modality | `MODALITY_XR` |
| Contrast | `CONTRAST_TYPE_NONE` |
| View count | `VIEW_COUNT_ONE/TWO/THREE/FOUR/COMPLETE` or `VIEW_COUNT_UNSPECIFIED` per manifest MR-M1 |
| Laterality | `LATERALITY_LEFT/RIGHT/BILATERAL` when legacy encodes side |
| Anatomic subregion | Use when body region alone insufficient (ribs, orbit, C-spine, etc.) |
| Protocol | Sunrise, upright, acute abdomen, decub, post-intubation |

**CPT:** All new rows → `PENDING_CPT_REVIEW` until Gate W3.

---

## 5. Part 5 — Implementation readiness

| Gate | Status |
|------|--------|
| Gate W1 (Haiti 44) | **CLOSED** |
| Gate W2 (enterprise workbook slice) | **OPEN** — XR batch CSV + sign-off required |
| Radiology EXPAND policy | **RESOLVED** in this design (enterprise-faithful rows) |
| MR abdomen / ribs | **RESOLVED** in this design — pending clinical ratification |
| French `displayNameFr` | **NOT READY** — authoring queue per row |
| Licensed CPT | **NOT READY** — Gate W3 |

### Verdict: Phase 2E.2A implementation

| Scope | Verdict |
|-------|---------|
| **2E.2A design / governance** | **SAFE** |
| **2E.2A catalog seed / migration** | **NOT SAFE** until Gate W2 batch sign-off + FR labels + staging dry-run |

---

## 6. Cross-references

| Document | Role |
|----------|------|
| `xray-expansion-candidate-list.md` | Full proposed code matrix |
| `xray-expansion-batch-plan.md` | XR-1 / XR-2 / XR-3 rollout |
| `enterprise-imaging-expansion-roadmap.md` | Program context |

---

*Audit only — no code, seeds, migrations, commits, or catalog inserts.*
